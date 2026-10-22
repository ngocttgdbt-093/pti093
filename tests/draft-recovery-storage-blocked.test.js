const assert=require('node:assert/strict');
global.window=global;
global.sessionStorage={
  getItem(){throw new Error('session storage blocked')},
  setItem(){throw new Error('session storage blocked')},
  removeItem(){throw new Error('session storage blocked')}
};
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
      return {
        objectStore(name){
          if(name==='drafts')return {delete(){}};
          return {index:()=>({openCursor:()=>{const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}})};
        }
      };
    }
  }),
  localDraftTransactionDone:async()=>{},getLocalDrafts:async()=>[]
});
assert.equal(typeof api.restoreAutoDraft,'function');
(async()=>{
  await assert.doesNotReject(api.restoreAutoDraft(),'blocked sessionStorage must not prevent the recovery flow from handling its own error');
  assert.ok(messages.some(text=>/Đã khôi phục công việc/.test(text))===false,'an unavailable draft must not be reported as restored');
  await assert.doesNotReject(api.finalizeCompletedSession(),'blocked localStorage must not turn a completed export into a reported failure');
  console.log('Draft Recovery storage-blocked tests passed (startup and session finalization tolerate blocked browser storage).');
})().catch(error=>{console.error(error);process.exitCode=1});
