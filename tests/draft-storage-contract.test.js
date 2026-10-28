const assert = require('node:assert/strict');
global.window = global;
require('../core/local-draft-store.js');

assert.equal(typeof global.PTILocalDraftStore.install, 'function');
assert.equal(typeof global.PTIDraftStorageContract.install, 'function');

assert.throws(
  () => global.PTIDraftStorageContract.install({provider:{}}),
  /must implement getLocalDraftBundle/,
  'Storage contract must reject providers that do not implement the required read API'
);

const expected = {meta:{id:'LOCAL-1',sections:[]},images:[{sectionIndex:0,itemIndex:0,file:{}}]};
let requestedId = '';
const contract = global.PTIDraftStorageContract.install({
  provider: {
    async getLocalDraftBundle(id) {
      requestedId = id;
      return expected;
    }
  }
});

(async()=>{
  const bundle = await contract.readBundle('LOCAL-1');
  assert.equal(requestedId,'LOCAL-1');
  assert.deepEqual(bundle,expected);
  await assert.rejects(contract.readBundle(''),/non-empty draft ID/);
  await assert.rejects(
    global.PTIDraftStorageContract.install({provider:{async getLocalDraftBundle(){return {meta:{id:'bad'}}}}}).readBundle('bad'),
    /invalid bundle/,
    'Malformed provider responses must fail closed'
  );

  const fs=require('node:fs');
  const appCore=fs.readFileSync('core/app-core.js','utf8');
  const localOpen=fs.readFileSync('core/local-open.js','utf8');
  assert.ok(appCore.includes('window.PTIDraftStorageContract.install({provider:localDraftStore})'),
    'App assembly must inject the neutral draft storage contract');
  assert.ok(appCore.includes('openLocalDraftDB,draftStorage,setDateInput'),
    'Local-open Core must receive the storage contract');
  assert.ok(localOpen.includes('const bundle=await draftStorage.readBundle(id)'),
    'Local-open must prefer the storage contract over direct IndexedDB access');
  assert.ok(localOpen.includes('// Compatibility fallback for older integrations/tests'),
    'Legacy callers must retain the compatibility fallback');

  // Exercise the actual IndexedDB provider: metadata and image blobs must be read
  // through one readonly transaction, avoiding mixed snapshots during concurrent saves.
  const metaRecord={id:'LOCAL-ATOMIC',sections:[]};
  const imageRecords=[{draftId:'LOCAL-ATOMIC',sectionIndex:0,itemIndex:0,file:{bytes:true}}];
  let transactionCalls=0,closed=0;
  global.IDBKeyRange={only:value=>value};
  global.indexedDB={
    open(){
      const request={};
      queueMicrotask(()=>{
        request.result={
          close(){closed++},
          transaction(names,mode){
            transactionCalls++;
            assert.deepEqual(names,['drafts','draftImages']);
            assert.equal(mode,'readonly');
            return {
              objectStore(name){
                if(name==='drafts')return {get(id){
                  assert.equal(id,'LOCAL-ATOMIC');
                  const req={};queueMicrotask(()=>{req.result=metaRecord;req.onsuccess&&req.onsuccess()});return req;
                }};
                if(name==='draftImages')return {index(name){
                  assert.equal(name,'draftId');
                  return {getAll(key){
                    assert.equal(key,'LOCAL-ATOMIC');
                    const req={};queueMicrotask(()=>{req.result=imageRecords;req.onsuccess&&req.onsuccess()});return req;
                  }};
                }};
                throw new Error('Unexpected object store '+name);
              }
            };
          }
        };
        request.onsuccess&&request.onsuccess();
      });
      return request;
    }
  };
  const localStore=global.PTILocalDraftStore.install({dbName:'test-draft-storage'});
  const actual=await localStore.getLocalDraftBundle('LOCAL-ATOMIC');
  assert.equal(transactionCalls,1,'metadata and image blobs must be read from exactly one transaction');
  assert.equal(closed,1,'database connection must close after the read');
  assert.equal(actual.meta,metaRecord);
  assert.deepEqual(actual.images,imageRecords);

  console.log('Draft Storage Contract tests passed (provider validation, atomic bundle read, app wiring, compatibility fallback).');
})().catch(error=>{console.error(error);process.exitCode=1});
