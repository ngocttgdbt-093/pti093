const assert = require('node:assert/strict');
global.window = global;
require('../core/local-save.js');

const noop=()=>{};
function makeElements(){
  const elements={};
  return id=>elements[id]||(elements[id]={value:id==='hoso'?'CASE-1':id==='bks'?'30A-12345':'',textContent:'',disabled:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){}}});
}
function makeDeps(state,storage){
  return {
    state,$:makeElements(),snapshotGroupsForProject:()=>[{title:'Thiệt hại',items:state.current.items.slice(),isCurrent:true}],
    openLocalDraftDB:async()=>{throw new Error('contract path must not open IndexedDB directly')},
    localDraftTransactionDone:async()=>{throw new Error('contract path must not create direct transactions')},
    draftStorage:storage,getDateISO:()=> '2026-10-29',selectedGdv:()=> 'GĐV test',
    setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
    showLocalSaveConfirm:async()=>false,clearAutoDraft:async()=>{}
  };
}

(async()=>{
  const item={file:{name:'damage.jpg',type:'image/jpeg',lastModified:1,size:3},key:'K1',caption:'Mặt trước',rotate:0,driveFileId:'DRIVE-FILE-1',driveFileName:'damage.jpg',driveUploadKey:'UPLOAD-1'};
  const state={groups:[],current:{title:'Thiệt hại',items:[item]},editing:-1,localDraftId:'',driveRecordId:'DRIVE-CASE-1',driveOpenIncomplete:false,localCopyFromIncompleteDrive:false,orientation:'portrait',per:6,workspaceOpenPending:false,workspaceRevision:1,workspaceMutationRevision:1};
  let savedMeta=null,savedImages=null,progressCalls=0;
  const storage={
    async writeBundle(meta,images,onProgress){
      savedMeta=meta;savedImages=images;
      assert.equal(meta.storageType,'local');
      assert.equal(meta.id.startsWith('LOCAL-'),true);
      assert.equal(images.length,1);
      assert.equal(images[0].draftId,meta.id);
      if(onProgress){onProgress();progressCalls++}
    }
  };
  const api=global.PTILocalSaveCore.install(makeDeps(state,storage));
  const id=await api.saveLocalDraft();
  assert.equal(id,savedMeta.id);
  assert.equal(savedImages[0].file,item.file);
  assert.equal(progressCalls,1);
  assert.equal(state.localDraftId,id);
  assert.equal(state.driveRecordId,'','Drive association should be cleared only after contract write resolves');
  assert.equal(item.driveFileId,'','image Drive references should be cleared only after successful local write');
  assert.equal(state.workspaceOpenPending,false,'workspace lock must always be released');
  console.log('Local Save Storage Contract success path passed.');

  const failedItem={file:{name:'damage.jpg',type:'image/jpeg',lastModified:1,size:3},driveFileId:'DRIVE-FILE-2',driveFileName:'damage.jpg',driveUploadKey:'UPLOAD-2'};
  const failedState={groups:[],current:{title:'Thiệt hại',items:[failedItem]},editing:-1,localDraftId:'LOCAL-OLD',driveRecordId:'DRIVE-CASE-2',driveOpenIncomplete:false,localCopyFromIncompleteDrive:false,orientation:'portrait',per:6,workspaceOpenPending:false,workspaceRevision:1,workspaceMutationRevision:1};
  const failedApi=global.PTILocalSaveCore.install(makeDeps(failedState,{async writeBundle(){throw new Error('simulated atomic write failure')}}));
  await assert.rejects(failedApi.saveLocalDraft(),/simulated atomic write failure/);
  assert.equal(failedState.driveRecordId,'DRIVE-CASE-2');
  assert.equal(failedState.localDraftId,'LOCAL-OLD');
  assert.equal(failedItem.driveFileId,'DRIVE-FILE-2');
  assert.equal(failedItem.driveUploadKey,'UPLOAD-2');
  assert.equal(failedState.workspaceOpenPending,false);
  console.log('Local Save Storage Contract failure-recovery path passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
