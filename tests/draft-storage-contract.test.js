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

  console.log('Draft Storage Contract tests passed (provider validation, bundle shape, app wiring, compatibility fallback).');
})().catch(error=>{console.error(error);process.exitCode=1});
