const assert=require('node:assert/strict');
global.window=global;
global.IDBKeyRange={only:value=>value};
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.File=class FakeFile{constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||0;this.size=10}};
global.document={querySelectorAll(){throw new Error('A stale restore must exit before applying UI state')}};
require('../core/draft-recovery.js');

(async()=>{
  let releaseOpen;
  const openGate=new Promise(resolve=>{releaseOpen=resolve});
  let firstOpen=true,renderCalls=0,clearCalls=0;
  const sessionId='session-current';
  session.set('pti093_work_session_id',sessionId);
  const meta={
    id:'AUTO-DRAFT-'+sessionId,auto:true,sessionId,caseNumber:'OLD-DRAFT',bks:'OLD-PLATE',
    garage:'Old garage',date:'2026-10-23',gdv:'',currentTitle:'Old draft',
    settings:{orientation:'portrait',imagesPerPage:6},
    sections:[{title:'Old section',isCurrent:true,items:[{
      fileName:'old.jpg',type:'image/jpeg',lastModified:1,size:10,key:'old',
      caption:'Old caption',rotate:0,addSeq:1
    }]}]
  };
  const storedImage={draftId:meta.id,sectionIndex:0,itemIndex:0,file:{bytes:'old'},fileName:'old.jpg',type:'image/jpeg',lastModified:1};
  const db={
    close(){},
    transaction(storeName){
      if(storeName==='drafts')return {objectStore:()=>({get:id=>{const req={};queueMicrotask(()=>{req.result=id===meta.id?meta:undefined;req.onsuccess&&req.onsuccess()});return req}})};
      if(storeName==='draftImages')return {objectStore:()=>({index:()=>({getAll:()=>{const req={};queueMicrotask(()=>{req.result=[storedImage];req.onsuccess&&req.onsuccess()});return req}})})};
      throw new Error('Unexpected store '+storeName);
    }
  };
  const values={
    gdv:{value:'',dataset:{custom:''},options:[]},hoso:{value:'NEW-CASE',dataset:{}},
    bks:{value:'NEW-PLATE',dataset:{}},garage:{value:'New garage',dataset:{}},
    date:{value:'23/10/2026',dataset:{}},title:{value:'New workspace',dataset:{}}
  };
  const state={
    groups:[{title:'New group',items:[{file:{name:'new.jpg'},caption:'New caption'}]}],
    current:{title:'New workspace',items:[]},editing:-1,pages:[{new:true}],pageDefs:[{new:true}],
    driveRecordId:'DRIVE-NEW',localDraftId:'LOCAL-NEW',driveOpenIncomplete:false,
    localCopyFromIncompleteDrive:false,workspaceRevision:5,workspaceMutationRevision:12,
    orientation:'landscape',per:3,addSeq:8
  };
  const api=global.PTI093DraftRecovery.install({
    state,$:id=>values[id]||(values[id]={value:'',dataset:{},options:[]}),
    getDateISO:()=>values.date.value,setDateInput:value=>{values.date.value=value||''},
    render:()=>{renderCalls++},renderLayout:()=>{renderCalls++},
    setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>{if(firstOpen){firstOpen=false;await openGate}return db},
    localDraftTransactionDone:async()=>{}
  });
  const originalSetTimeout=global.setTimeout;
  global.setTimeout=()=>1;
  try{
    const restore=api.restoreAutoDraft();
    // Simulate another case completing its open while IndexedDB is still pending.
    state.workspaceOpenPending=true;
    state.workspaceRevision++;
    state.workspaceOpenPending=false;
    state.driveRecordId='DRIVE-NEW';
    values.hoso.value='NEW-CASE';
    releaseOpen();
    await restore;
    assert.equal(state.groups[0].title,'New group','the newly opened workspace must not be replaced by the older draft');
    assert.equal(state.driveRecordId,'DRIVE-NEW','new Drive identity must remain active');
    assert.equal(values.hoso.value,'NEW-CASE','new case metadata must remain intact');
    assert.equal(renderCalls,0,'stale restore must exit before rendering old workspace state');
    assert.equal(clearCalls,0,'stale restore must not clear draft data');
    console.log('AUTO-DRAFT restore/open race regression passed.');
  }finally{global.setTimeout=originalSetTimeout}
})().catch(error=>{console.error(error);process.exitCode=1});
