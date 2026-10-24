const assert=require('node:assert/strict');
global.window=global;
global.File=class FakeFile{constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||1;this.size=options.size||10;this.data=parts[0]}};
global.IDBKeyRange={only:value=>value};
global.scrollY=0;global.scrollTo=()=>{};
global.sessionStorage={getItem(){return null},setItem(){},removeItem(){}};
global.localStorage={getItem(){return null},setItem(){},removeItem(){}};
global.document={querySelectorAll:()=>[]};
require('../core/workspace.js');
require('../core/local-save.js');
require('../core/local-open.js');

const records=new Map(),storedImages=new Map();
const db={
 close(){},
 transaction(storeNames){
  const tx={objectStore(name){
   if(name==='drafts')return {
    put(meta){records.set(meta.id,JSON.parse(JSON.stringify(meta)))},
    get(id){const req={};queueMicrotask(()=>{req.result=records.get(id);req.onsuccess&&req.onsuccess()});return req}
   };
   if(name==='draftImages')return {
    put(image){storedImages.set(image.id,image)},
    index(){return {
     openCursor(range){const req={};const entries=[...storedImages.entries()].filter(([,image])=>image.draftId===range);let i=0;const next=()=>queueMicrotask(()=>{if(i<entries.length){const [key]=entries[i++];req.result={delete(){storedImages.delete(key)},continue:next}}else req.result=null;req.onsuccess&&req.onsuccess()});next();return req},
     getAll(range){const req={};queueMicrotask(()=>{req.result=[...storedImages.values()].filter(image=>image.draftId===range);req.onsuccess&&req.onsuccess()});return req}
    }}
   };
   throw new Error('Unexpected store '+name)
  }};
  return tx
 }
};
const values={};
const el=id=>values[id]||(values[id]={value:'',textContent:'',dataset:{},options:[],style:{},classList:{add(){},remove(){},toggle(){}},getBoundingClientRect:()=>({top:0})});
const state={
 groups:[{title:'Nhóm B',items:[{file:new File(['b'],'b.jpg'),key:'b',caption:'Ảnh B',rotate:90,addSeq:2}]}],
 current:{title:'Nhóm A đang sửa',items:[]},editing:0,
 workspaceRevision:1,workspaceMutationRevision:1,orientation:'portrait',per:6,
 driveRecordId:'DRIVE-123',localDraftId:'',driveOpenIncomplete:false,localCopyFromIncompleteDrive:false,addSeq:2
};
const noop=()=>{};
const savedApi=global.PTILocalSaveCore.install({
 state,$:el,snapshotGroupsForProject:()=>global.PTIWorkspaceCore.snapshotGroupsForProject(state),
 openLocalDraftDB:async()=>db,localDraftTransactionDone:async()=>{},
 getDateISO:()=> '2026-10-23',selectedGdv:()=> 'GĐV A',
 setDriveState:noop,msg:noop,renderLocalSaveFeedback:noop,
 showLocalSaveConfirm:async()=>true,clearAutoDraft:async()=>{}
});
const openApi=global.PTI093LocalOpenCore.install({
 state,$:el,msg:noop,openLocalDraftDB:async()=>db,
 setDateInput:value=>{el('date').value=value||''},render:noop,renderLayout:noop,setDriveState:noop,
 deviceStorageLabel:()=> 'PC',setOpenLoad:noop,finishOpenLoad:noop,scheduleAutoDraftSave:noop
});
(async()=>{
 const originalSetTimeout=global.setTimeout;global.setTimeout=()=>1;
 try{
  const id=await savedApi.saveLocalDraft();
  const meta=records.get(id);
  assert.deepEqual(meta.sections.map(section=>section.title),['Nhóm A đang sửa','Nhóm B']);
  assert.equal(meta.sections[0].isCurrent,true);
  assert.equal(meta.sections[0].items.length,0,'manual local save must retain an empty group under edit');
  assert.equal(meta.editing,0);
  state.groups=[];state.current={title:'Blank',items:[]};state.editing=-1;
  await openApi.openLocalDraft(id);
  assert.deepEqual(state.groups.map(group=>group.title),['Nhóm B']);
  assert.equal(state.current.title,'Nhóm A đang sửa');
  assert.equal(state.current.items.length,0);
  assert.equal(state.editing,0,'manual local open must restore the in-progress edit index');
  assert.equal(state.groups[0].items[0].caption,'Ảnh B');
  assert.equal(state.groups[0].items[0].rotate,90);
  console.log('Manual local save/open edited-empty-group regression passed.');
 }finally{global.setTimeout=originalSetTimeout}
})().catch(error=>{console.error(error);process.exitCode=1});
