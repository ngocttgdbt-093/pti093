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
let requestedId = '',writtenBundle=null,metadataWritten=null,deletedId='';
const contract = global.PTIDraftStorageContract.install({
  provider: {
    async getLocalDraftBundle(id) {
      requestedId = id;
      return expected;
    },
    async writeLocalDraftBundle(meta,images,onProgress){writtenBundle={meta,images,onProgress};if(onProgress)onProgress();return 'written'},
    async writeLocalDraftMetadata(meta){metadataWritten=meta;return 'metadata-written'},
    async deleteLocalDraftBundle(id){deletedId=id;return 'deleted'}
  }
});

(async()=>{
  const bundle = await contract.readBundle('LOCAL-1');
  assert.equal(requestedId,'LOCAL-1');
  assert.deepEqual(bundle,expected);
  const imageBatch=[{id:'LOCAL-1|0|0',draftId:'LOCAL-1',file:{}}];
  let progressCalled=false;
  assert.equal(await contract.writeBundle(expected.meta,imageBatch,()=>{progressCalled=true}),'written');
  assert.equal(writtenBundle.meta,expected.meta);
  assert.deepEqual(writtenBundle.images,imageBatch);
  assert.equal(progressCalled,true,'storage progress callback should be forwarded');
  assert.equal(await contract.writeMetadata(expected.meta),'metadata-written');
  assert.equal(metadataWritten,expected.meta);
  assert.equal(await contract.deleteBundle('LOCAL-1'),'deleted');
  assert.equal(deletedId,'LOCAL-1');
  await assert.rejects(contract.writeBundle(expected.meta,[{draftId:'OTHER'}]),/match the metadata id/);
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
  const recovery=fs.readFileSync('core/draft-recovery.js','utf8');
  assert.ok(appCore.includes('localDraftTransactionDone,draftStorage,fileKey'),
    'App assembly must inject storage contract into autosave recovery');
  assert.ok(recovery.includes('await draftStorage.writeBundle(meta,imageRecords)'),
    'Autosave must use the contract when image data is dirty');
  assert.ok(recovery.includes('await draftStorage.writeMetadata(meta)'),
    'Metadata-only autosave must not replace image blobs');
  assert.ok(recovery.includes('await draftStorage.deleteBundle(activeAutoDraftId)'),
    'Autosave cleanup must use the contract');
  const localSave=fs.readFileSync('core/local-save.js','utf8');
  assert.ok(appCore.includes('openLocalDraftDB,localDraftTransactionDone,draftStorage,getDateISO'),
    'App assembly must inject the storage contract into local-save');
  assert.ok(localSave.includes('await draftStorage.writeBundle(meta,imageRecords,'),
    'Manual local saves must prefer the storage contract');
  assert.ok(localSave.includes('if(!draftStorage)db=await openLocalDraftDB()'),
    'Contract-backed local saves must not open a second database connection');
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
            const tx={
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
            queueMicrotask(()=>{if(tx.oncomplete)tx.oncomplete()});
            return tx;
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

  // Exercise the actual provider write path and ensure it commits metadata + replacement images atomically.
  const stored={meta:null,images:[]};let writeTransactionCount=0,writeDbClosed=0;
  global.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={
    close(){writeDbClosed++},
    transaction(names,mode){
      writeTransactionCount++;assert.deepEqual(names,['drafts','draftImages']);assert.equal(mode,'readwrite');
      const tx={objectStore(name){
        if(name==='drafts')return {put(value){stored.meta=value}};
        if(name==='draftImages')return {put(value){stored.images.push(value)},index(name){assert.equal(name,'draftId');return {openCursor(key){
          assert.equal(key,'LOCAL-WRITE');const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess();queueMicrotask(()=>tx.oncomplete&&tx.oncomplete())});return req;
        }}}};
        throw new Error('Unexpected write store '+name);
      }};
      return tx;
    }
  };request.onsuccess&&request.onsuccess()});return request}};
  const writeStore=global.PTILocalDraftStore.install({dbName:'test-draft-write'});
  const writeMeta={id:'LOCAL-WRITE',sections:[]};
  const writeImages=[{id:'LOCAL-WRITE|0|0',draftId:'LOCAL-WRITE',file:{blob:true}}];
  let writeProgress=false;
  await writeStore.writeLocalDraftBundle(writeMeta,writeImages,()=>{writeProgress=true});
  assert.equal(writeTransactionCount,1,'metadata and images must use one readwrite transaction');
  assert.equal(writeDbClosed,1,'database connection must close after the write');
  assert.equal(stored.meta,writeMeta);
  assert.deepEqual(stored.images,writeImages);
  assert.equal(writeProgress,true,'write progress must fire after old images are removed and before replacement images are written');

  console.log('Draft Storage Contract tests passed (atomic read/write, provider validation, app wiring, compatibility fallback).');
})().catch(error=>{console.error(error);process.exitCode=1});
