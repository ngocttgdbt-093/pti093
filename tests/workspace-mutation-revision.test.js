const assert=require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
require('../core/draft-recovery.js');

const originalSetTimeout=global.setTimeout;
let scheduled=0;
global.setTimeout=(callback,delay)=>{scheduled++;return scheduled};
try{
  const state={groups:[],current:{title:'Revision test',items:[]},workspaceMutationRevision:0};
  const api=global.PTI093DraftRecovery.install({
    state,
    $:id=>({value:'',dataset:{}}),
    getDateISO:()=>'',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},
    setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>{throw new Error('timer callback should not run in this unit test')},
    localDraftTransactionDone:async()=>{}
  });
  api.scheduleAutoDraftSave(false);
  assert.equal(state.workspaceMutationRevision,1,'metadata-only changes must advance workspace content revision');
  assert.equal(scheduled,1,'change should queue the normal debounced autosave');
  console.log('Workspace content revision test passed.');
}finally{
  global.setTimeout=originalSetTimeout;
}
