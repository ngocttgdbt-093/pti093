const assert=require('node:assert/strict');
global.window=global;
global.sessionStorage={
  getItem(){throw new Error('session storage blocked')},
  setItem(){throw new Error('session storage blocked')},
  removeItem(){throw new Error('session storage blocked')}
};
global.IDBKeyRange={only:value=>value};
global.localStorage={
  getItem(){throw new Error('local storage blocked')},
  setItem(){throw new Error('local storage blocked')},
  removeItem(){throw new Error('local storage blocked')}
};
require('../core/draft-recovery.js');
assert.ok(global.PTI093DraftRecovery,'Draft Recovery Core should load');
const messages=[];
const api=global.PTI093DraftRecovery.install({
  state:{groups:[],current:{title:'Bản ảnh chi tiết thiệt hại',items:[]},editing:-1,pages:[],pageDefs:[],driveRecordId:'',localDraftId:'',orientation:'portrait',per:6,addSeq:0},
  $:id=>({value:id==='gdv'?'Nhập tên khác':'',textContent:'',dataset:{custom:''},options:[],classList:{add(){},remove(){},toggle(){}}}),
  getDateISO:()=> '2026-10-23',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:()=>{},
  msg:text=>messages.push(text),
  openLocalDraftDB:async()=>({
    close(){},
    transaction(){
      return {objectStore(name){
        if(name==='drafts')return {
          get(){const req={};queueMicrotask(()=>{req.result=undefined;req.onsuccess&&req.onsuccess()});return req},
          delete(){},put(){}
        };
        return {index:()=>({
          getAll(){const req={};queueMicrotask(()=>{req.result=[];req.onsuccess&&req.onsuccess()});return req},
          openCursor(){const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}
        })};
      }};
    }
  }),
  localDraftTransactionDone:async()=>{},getLocalDrafts:async()=>[]
});
assert.equal(typeof api.restoreAutoDraft,'function');
(async()=>{
  const warnings=[];
  const originalWarn=console.warn;
  console.warn=(...args)=>warnings.push(args);
  try{
    await assert.doesNotReject(api.restoreAutoDraft(),'blocked sessionStorage must not prevent the recovery flow from handling its own error');
    assert.equal(messages.some(text=>/Đã khôi phục công việc/.test(text)),false,'an unavailable draft must not be reported as restored');
    assert.equal(await api.finalizeCompletedSession(),true,'successful IndexedDB cleanup should return true even when preference storage is blocked');
    assert.equal(warnings.length,0,'the IndexedDB cleanup fixture should succeed; only browser preference storage is blocked');
  }finally{console.warn=originalWarn;delete global.IDBKeyRange}

  const originalWarn2=console.warn;
  console.warn=()=>{};
  try{
    const failedCleanupApi=global.PTI093DraftRecovery.install({
      state:{groups:[],current:{title:'Thiệt hại',items:[]},editing:-1,pages:[],pageDefs:[],driveRecordId:'',localDraftId:'LOCAL-1',orientation:'portrait',per:6,addSeq:0},
      $:id=>({value:'',textContent:'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}}}),
      getDateISO:()=> '2026-10-23',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
      openLocalDraftDB:async()=>{throw new Error('IndexedDB unavailable')},
      localDraftTransactionDone:async()=>{},getLocalDrafts:async()=>[]
    });
    assert.equal(await failedCleanupApi.finalizeCompletedSession(),false,'finalizer must return false when AUTO-DRAFT cleanup fails');
  }finally{console.warn=originalWarn2}
  console.log('Draft Recovery storage-blocked tests passed (startup and explicit finalization success/failure results).');
})().catch(error=>{console.error(error);process.exitCode=1});
