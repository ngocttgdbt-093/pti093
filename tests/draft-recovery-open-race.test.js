const assert=require('node:assert/strict');
global.window=global;
global.IDBKeyRange={only:value=>value};
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
require('../core/draft-recovery.js');

(async()=>{
  let releaseOpen;
  const openGate=new Promise(resolve=>{releaseOpen=resolve});
  let firstOpen=true,transactionCount=0;
  const written=[];
  const db={
    close(){},
    transaction(storeNames){
      transactionCount++;
      return {objectStore(name){
        if(name==='drafts')return {put(meta){written.push(meta)}};
        if(name==='draftImages')return {index(){return {openCursor(){
          const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req;
        }}}};
        throw new Error('Unexpected store '+name);
      }};
    }
  };
  const values={
    gdv:{value:'',dataset:{custom:''}},hoso:{value:'OLD-CASE'},bks:{value:'OLD-PLATE'},
    garage:{value:''},date:{value:'2026-10-23'},title:{value:'Current'}
  };
  const state={groups:[],current:{title:'Current',items:[]},workspaceRevision:4,workspaceMutationRevision:10,
    orientation:'portrait',per:6,driveRecordId:'',localDraftId:''};
  const api=global.PTI093DraftRecovery.install({
    state,$:id=>values[id]||(values[id]={value:'',dataset:{}}),
    getDateISO:()=>values.date.value,setDateInput:value=>{values.date.value=value||''},
    render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>{if(firstOpen){firstOpen=false;await openGate}return db},
    localDraftTransactionDone:async()=>{}
  });
  const originalSetTimeout=global.setTimeout;
  global.setTimeout=(callback)=>1;
  try{
    const staleSave=api.saveAutoDraft();
    values.hoso.value='NEW-CASE';
    api.scheduleAutoDraftSave(false);
    api.clearAutoDraftTimer();
    releaseOpen();
    await staleSave;
    assert.equal(transactionCount,0,'a metadata-stale autosave must be rejected before starting any IndexedDB write transaction');
    assert.equal(written.length,0,'a stale snapshot must not be persisted');

    await api.saveAutoDraft();
    assert.equal(transactionCount,1,'the next autosave should persist the latest snapshot');
    assert.equal(written.length,1);
    assert.equal(written[0].caseNumber,'NEW-CASE','the saved draft must contain the newest form metadata');
    console.log('Autosave IndexedDB-open race regression passed.');
  }finally{
    global.setTimeout=originalSetTimeout;
  }
})().catch(error=>{console.error(error);process.exitCode=1});
