const assert=require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
global.IDBKeyRange={only:value=>value};
require('../core/draft-recovery.js');

(async()=>{
  let releaseFirst,signalFirstWrite,signalSecondDone;
  const firstWrite=new Promise(resolve=>{signalFirstWrite=resolve});
  const firstGate=new Promise(resolve=>{releaseFirst=resolve});
  const secondDone=new Promise(resolve=>{signalSecondDone=resolve});
  const metadata=[];
  let transactionDoneCount=0;
  const db={
    close(){},
    transaction(storeNames){
      return {objectStore(name){
        if(name==='drafts')return {put(meta){metadata.push(meta);if(metadata.length===1)signalFirstWrite()}};
        if(name==='draftImages')return {index(){return {openCursor(){const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}}}};
        throw new Error('Unexpected store '+name);
      }};
    }
  };
  const values={gdv:{value:'',dataset:{custom:''}},hoso:{value:'OLD-CASE'},bks:{value:'OLD-PLATE'},garage:{value:''},date:{value:'2026-10-23'},title:{value:'Current'}};
  const state={groups:[],current:{title:'Current',items:[]},workspaceRevision:0,workspaceMutationRevision:0,orientation:'portrait',per:6,driveRecordId:'',localDraftId:''};
  const api=global.PTI093DraftRecovery.install({
    state,$:id=>values[id]||(values[id]={value:'',dataset:{}}),
    getDateISO:()=>values.date.value,setDateInput:value=>{values.date.value=value||''},
    render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>db,
    localDraftTransactionDone:async()=>{
      transactionDoneCount++;
      if(transactionDoneCount===1)await firstGate;
      else if(transactionDoneCount===2)signalSecondDone();
    }
  });
  const originalSetTimeout=global.setTimeout;
  global.setTimeout=(callback,delay)=>1;
  try{
    const firstSave=api.saveAutoDraft();
    await firstWrite;
    values.hoso.value='NEW-CASE';
    api.scheduleAutoDraftSave(false);
    api.clearAutoDraftTimer();
    await api.saveAutoDraft();
    releaseFirst();
    await firstSave;
    await secondDone;
    assert.equal(metadata.length,2,'a queued save must run immediately after the in-flight save finishes');
    assert.equal(metadata[0].caseNumber,'OLD-CASE','the first save should retain its captured snapshot');
    assert.equal(metadata[1].caseNumber,'NEW-CASE','the immediate follow-up save must persist the latest form metadata');
    console.log('In-flight autosave flush regression passed.');
  }finally{
    global.setTimeout=originalSetTimeout;
  }
})().catch(error=>{console.error(error);process.exitCode=1});
