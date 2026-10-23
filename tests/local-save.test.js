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
  global.IDBKeyRange={only:value=>value};
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
  delete global.localStorage;delete global.IDBKeyRange;
  console.log('Local Save storage-blocked test passed (saved record remains successful despite blocked GĐV preference storage).');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
  const elements={},messages=[],driveStates=[];
  const localState={groups:[],current:{title:'Thiệt hại',items:[]},localDraftId:'',driveRecordId:'',orientation:'portrait',per:6};
  global.localStorage={getItem(){throw new Error('localStorage blocked')},setItem(){throw new Error('localStorage blocked')},removeItem(){}};
  global.IDBKeyRange={only:value=>value};
  const db={
    close(){},
    transaction(){return {objectStore(name){
      if(name==='drafts')return {put(){}};
      return {index:()=>({openCursor:()=>{const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}})};
    }}}
  };
  const api=global.PTILocalSaveCore.install({
    state:localState,
    $:id=>elements[id]||(elements[id]={value:id==='gdv'?'Nhập tên khác':'',dataset:{custom:''},textContent:'',disabled:false,style:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[],openLocalDraftDB:async()=>db,localDraftTransactionDone:async()=>{},
    getDateISO:()=> '2026-10-23',selectedGdv:()=> 'NONAME',
    setDriveState:(text)=>driveStates.push(text),msg:(text)=>messages.push(text),renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>true,clearAutoDraft:async()=>{throw new Error('cleanup failed')}
  });
  await api.saveDraftWithoutPhotos();
  assert.match(localState.localDraftId,/^LOCAL-/,'the saved local record ID must remain after autosave cleanup fails');
  assert.ok(messages.some(text=>/đã lưu tại máy thành công/i.test(text)),'user should be told the local record was saved');
  assert.equal(messages.some(text=>/Lưu tại máy thất bại/.test(text)),false,'autosave cleanup failure must not be misreported as local record save failure');
  assert.ok(driveStates.some(text=>/chưa dọn được nháp tự động/.test(text)),'cleanup failure should remain visible as a separate warning');
  delete global.localStorage;delete global.IDBKeyRange;
  console.log('Local Save cleanup-failure test passed (successful record save is not misreported as failed).');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
  const itemA={file:{name:'scene.jpg',type:'image/jpeg',lastModified:111,size:10},key:'scene-key',caption:'Toàn cảnh',rotate:90,addSeq:4,driveFileId:'DRIVE-A',driveFileName:'scene.jpg',driveUploadKey:'upload-a'};
  const itemB={file:{name:'damage.jpg',type:'image/jpeg',lastModified:222,size:20},key:'damage-key',caption:'Mặt trước',rotate:180,addSeq:7,driveFileId:'DRIVE-B',driveFileName:'damage.jpg',driveUploadKey:'upload-b'};
  const savedMetadata=[],savedImages=[],elements={};
  const localState={groups:[{title:'Ảnh hiện trường',items:[itemA]}],current:{title:'Ảnh thiệt hại',items:[itemB]},localDraftId:'',driveRecordId:'DRIVE-CASE-1',driveOpenIncomplete:true,orientation:'portrait',per:6};
  global.IDBKeyRange={only:value=>value};
  const db={
    close(){},
    transaction(){
      return {objectStore(name){
        if(name==='drafts')return {put(meta){savedMetadata.push(meta)}};
        return {
          index:()=>({openCursor:()=>{const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}}),
          put(row){savedImages.push(row)}
        };
      }};
    }
  };
  const api=global.PTILocalSaveCore.install({
    state:localState,
    $:id=>elements[id]||(elements[id]={value:({hoso:'HS-LOCAL-1',bks:'30A-12345',garage:'Garage A'}[id]||''),textContent:'',disabled:false,style:{},dataset:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[
      {title:'Ảnh hiện trường',items:[itemA]},
      {title:'Ảnh thiệt hại',items:[itemB]}
    ],
    openLocalDraftDB:async()=>db,localDraftTransactionDone:async()=>{},
    getDateISO:()=> '2026-10-23',selectedGdv:()=> 'GĐV test',
    setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>true,clearAutoDraft:async()=>{}
  });
  const id=await api.saveLocalDraft();
  assert.match(id,/^LOCAL-/,'a new local-only record should receive a LOCAL ID');
  assert.equal(savedMetadata.length,1);
  assert.equal(savedMetadata[0].id,id);
  assert.equal(savedMetadata[0].storageType,'local');
  assert.deepEqual(savedMetadata[0].sections.map(s=>s.title),['Ảnh hiện trường','Ảnh thiệt hại']);
  assert.deepEqual(savedMetadata[0].sections.map(s=>s.items[0].caption),['Toàn cảnh','Mặt trước']);
  assert.deepEqual(savedMetadata[0].sections.map(s=>s.items[0].rotate),[90,180]);
  assert.deepEqual(savedMetadata[0].sections.map(s=>s.items[0].addSeq),[4,7]);
  assert.equal(savedImages.length,2);
  assert.equal(savedImages[0].file,itemA.file);
  assert.equal(savedImages[1].file,itemB.file);
  assert.equal(localState.localDraftId,id);
  assert.equal(localState.driveRecordId,'');
  assert.equal(localState.driveOpenIncomplete,false,'successful local copy must clear the Drive incomplete-open guard');
  assert.equal(itemA.driveFileId,'');
  assert.equal(itemA.driveUploadKey,'');
  assert.equal(itemB.driveFileId,'');
  assert.equal(itemB.driveUploadKey,'');
  delete global.IDBKeyRange;
  console.log('Local Save success-path regression passed (section order, captions, rotations, image blobs, and Drive-state separation).');
})().catch(error=>{console.error(error);process.exitCode=1});


(async()=>{
  // Regression gap found during audit: DB opening failure was covered, but a write
  // transaction can fail after requests are queued. The Drive state must still survive.
  const item={file:{name:'transaction-failure.jpg',type:'image/jpeg',lastModified:7,size:9},driveFileId:'DRIVE-FILE-KEEP',driveFileName:'transaction-failure.jpg',driveUploadKey:'upload-keep'};
  const elements={};
  const appState={groups:[],current:{title:'Thiệt hại',items:[item]},localDraftId:'LOCAL-PREVIOUS',driveRecordId:'DRIVE-CASE-KEEP',driveOpenIncomplete:true,orientation:'portrait',per:6};
  global.IDBKeyRange={only:value=>value};
  const tx={objectStore(name){
    if(name==='drafts')return {put(){}};
    return {index:()=>({openCursor:()=>{const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}}),put(){}};
  }};
  const db={close(){},transaction(){return tx}};
  const failureApi=global.PTILocalSaveCore.install({
    state:appState,
    $:id=>elements[id]||(elements[id]={value:'',textContent:'Hồ sơ: DRIVE-CASE-KEEP',disabled:false,style:{},dataset:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[{title:'Thiệt hại',items:[item]}],
    openLocalDraftDB:async()=>db,
    localDraftTransactionDone:async()=>{throw new Error('Synthetic write transaction aborted')},
    getDateISO:()=> '2026-10-23',selectedGdv:()=> 'GĐV test',
    setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>false,clearAutoDraft:async()=>{}
  });
  await assert.rejects(failureApi.saveLocalDraft(),/Synthetic write transaction aborted/);
  assert.equal(appState.driveRecordId,'DRIVE-CASE-KEEP','aborted IndexedDB writes must preserve the active Drive record ID');
  assert.equal(appState.localDraftId,'LOCAL-PREVIOUS','aborted IndexedDB writes must preserve the previous local record ID');
  assert.equal(appState.driveOpenIncomplete,true,'failed local copy must retain the incomplete-Drive guard');
  assert.equal(item.driveFileId,'DRIVE-FILE-KEEP','aborted IndexedDB writes must preserve image Drive references');
  assert.equal(item.driveUploadKey,'upload-keep','aborted IndexedDB writes must preserve upload tracking');
  assert.match(elements.driveId.textContent,/DRIVE-CASE-KEEP/,'UI should keep the valid Drive ID after an aborted local save');
  delete global.IDBKeyRange;
  console.log('Local Save transaction-abort regression passed (Drive/local identifiers and image references remain intact).');
})().catch(error=>{console.error(error);process.exitCode=1});


(async()=>{
  const state={groups:[],current:{title:'Đang mở',items:[]},localDraftId:'',driveRecordId:'',workspaceOpenPending:true};
  let opened=false;
  const api=global.PTILocalSaveCore.install({
    state,$:()=>({value:'',textContent:'',disabled:false,style:{},dataset:{},classList:{add(){},remove(){}}}),
    snapshotGroupsForProject:()=>[],openLocalDraftDB:async()=>{opened=true;throw new Error('should not open DB')},
    localDraftTransactionDone:async()=>{},getDateISO:()=>'',selectedGdv:()=>'',setDriveState:noop,msg:noop,
    renderLocalSaveFeedback:noop,showLocalSaveConfirm:async()=>true,clearAutoDraft:async()=>{}
  });
  await assert.rejects(api.saveLocalDraft(),/Đang mở hồ sơ khác/,
    'local save must not snapshot stale workspace while another record is opening');
  assert.equal(opened,false,'blocked local save must not start an IndexedDB transaction');
  console.log('Local Save workspace-open lock regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
