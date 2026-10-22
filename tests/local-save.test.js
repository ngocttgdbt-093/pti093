const assert = require('node:assert/strict');
global.window = global;
require('../core/local-save.js');
assert.ok(global.PTILocalSaveCore, 'Local-save Core module should load');
const noop = () => {};
const state = { groups: [], current: { title: 'Thiệt hại', items: [] }, localDraftId: '', driveRecordId: '' };
const deps = {
  state,
  $: () => ({ value: '', textContent: '', disabled: false, style: {}, classList: { add(){}, remove(){} } }),
  snapshotGroupsForProject: () => [],
  openLocalDraftDB: async () => { throw new Error('not called in API contract test'); },
  localDraftTransactionDone: async () => {},
  getDateISO: () => '2026-10-22',
  selectedGdv: () => 'GĐV test',
  setDriveState: noop,
  msg: noop,
  renderLocalSaveFeedback: noop,
  showLocalSaveConfirm: async () => false,
  clearAutoDraft: async () => {}
};
const elements={};
deps.$=id=>elements[id]||(elements[id]={value:'',textContent:'',disabled:false,style:{},classList:{add(){},remove(){}}});
const api = global.PTILocalSaveCore.install(deps);
assert.equal(typeof api.saveLocalDraft, 'function');
assert.equal(typeof api.saveDraftWithoutPhotos, 'function');
assert.equal(typeof api.bindControls, 'function');
api.bindControls();
assert.equal(elements.driveSaveDraft.onclick,api.saveDraftWithoutPhotos,'Local Save Core should own the local-save button binding');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const appCore = fs.readFileSync('core/app-core.js', 'utf8');
const source = fs.readFileSync('core/local-save.js', 'utf8');
assert.ok(html.includes('src="./core/local-save.js"'), 'index.html should load the local-save Core module');
assert.ok(appCore.includes('window.PTILocalSaveCore.install('), 'App should install the local-save Core module from core/app-core.js');
assert.ok(!html.includes('async function saveLocalDraft('), 'Manual local-save should be outside index.html');
assert.ok(!html.includes('async function saveDraftWithoutPhotos('), 'Local draft button orchestration should be outside index.html');
for (const forbidden of ['PTI093_API', 'pti093UploadAll(', 'saveProjectToDrive(']) {
  assert.ok(!source.includes(forbidden), 'Local-save Core must not invoke Drive case saving: ' + forbidden);
}
assert.ok(source.includes("storageType:'local'"), 'Local save should retain the local storage type');
console.log('Shared Core local-save tests passed (API and Drive-isolation contract).');

(async()=>{
  const item={file:{name:'damage.jpg',type:'image/jpeg',lastModified:1,size:4},driveFileId:'DRIVE-FILE-1',driveFileName:'damage.jpg',driveUploadKey:'upload-key'};
  const failureState={groups:[],current:{title:'Thiệt hại',items:[item]},localDraftId:'LOCAL-OLD',driveRecordId:'DRIVE-CASE-1',orientation:'portrait',per:6};
  const failureElements={driveId:{value:'',textContent:'Hồ sơ: DRIVE-CASE-1',disabled:false,style:{},classList:{add(){},remove(){}}}};
  const failureDeps={
    state:failureState,
    $:id=>failureElements[id]||(failureElements[id]={value:'',textContent:'',disabled:false,style:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[{title:'Thiệt hại',items:[item]}],
    openLocalDraftDB:async()=>{throw new Error('IndexedDB unavailable')},
    localDraftTransactionDone:async()=>{},
    getDateISO:()=> '2026-10-23',
    selectedGdv:()=> 'GĐV test',
    setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>false,clearAutoDraft:async()=>{}
  };
  const failureApi=global.PTILocalSaveCore.install(failureDeps);
  await assert.rejects(failureApi.saveLocalDraft(),/IndexedDB unavailable/);
  assert.equal(failureState.driveRecordId,'DRIVE-CASE-1','failed local save must preserve the active Drive case');
  assert.equal(failureElements.driveId.textContent,'Hồ sơ: DRIVE-CASE-1','failed local save must not display an ID for a record that was never saved');
  assert.equal(failureState.localDraftId,'LOCAL-OLD','failed local save must preserve the previous local ID');
  assert.equal(item.driveFileId,'DRIVE-FILE-1','failed local save must not erase image Drive references');
  assert.equal(item.driveUploadKey,'upload-key','failed local save must preserve upload tracking metadata');
  console.log('Local Save failure-recovery test passed (Drive state remains intact when IndexedDB fails).');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
  const elements={};
  const localState={groups:[],current:{title:'Thiệt hại',items:[]},localDraftId:'',driveRecordId:'',orientation:'portrait',per:6};
  let cleared=0;
  global.localStorage={getItem(){throw new Error('localStorage blocked')},setItem(){throw new Error('localStorage blocked')},removeItem(){}};
  const db={
    close(){},
    transaction(){
      return {objectStore(name){
        if(name==='drafts')return {put(){}};
        return {index:()=>({openCursor:()=>{const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}})};
      }};
    }
  };
  const safeApi=global.PTILocalSaveCore.install({
    state:localState,
    $:id=>elements[id]||(elements[id]={value:id==='gdv'?'Nhập tên khác':'',dataset:{custom:''},textContent:'',disabled:false,style:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[],
    openLocalDraftDB:async()=>db,
    localDraftTransactionDone:async()=>{},
    getDateISO:()=> '2026-10-23',
    selectedGdv:()=> 'NONAME',
    setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>true,
    clearAutoDraft:async()=>{cleared++}
  });
  await safeApi.saveDraftWithoutPhotos();
  assert.match(localState.localDraftId,/^LOCAL-/,'local save should complete despite blocked localStorage');
  assert.equal(cleared,1,'successful local save should still clean the autosave draft');
  assert.equal(elements.driveSaveDraft.disabled,false,'save control should be re-enabled');
  delete global.localStorage;
  console.log('Local Save storage-blocked test passed (saved record remains successful despite blocked GĐV preference storage).');
})().catch(error=>{console.error(error);process.exitCode=1});
