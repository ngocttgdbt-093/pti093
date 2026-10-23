const assert=require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={getItem:key=>session.has(key)?session.get(key):null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.IDBKeyRange={only:value=>value};
global.File=class FakeFile{
  constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||0;this.size=10;this.data=parts[0]}
};
require('../core/draft-recovery.js');

const oldImage={sectionIndex:0,itemIndex:0,file:new File(['old'],'old.jpg',{type:'image/jpeg',lastModified:1}),fileName:'old.jpg',type:'image/jpeg',lastModified:1};
const oldMeta={id:'AUTO-DRAFT',auto:true,sessionId:'',caseNumber:'HS-OLD',bks:'OLD-PLATE',garage:'Old garage',date:'2026-10-22',gdv:'Old GĐV',settings:{orientation:'landscape',imagesPerPage:4},currentTitle:'Old group',sections:[{title:'Old group',isCurrent:true,items:[{fileName:'old.jpg',type:'image/jpeg',lastModified:1,key:'old',caption:'Old caption',rotate:90,addSeq:1}]}]};
const saved={meta:null,images:[],closed:0};
let resolveOpen;
let firstOpen=true;
let finishWrite;
const writeFinished=new Promise(resolve=>{finishWrite=resolve});
const db={
  close(){saved.closed++},
  transaction(storeNames){
    const readImages=storeNames==='draftImages';
    const write=Array.isArray(storeNames);
    return {
      objectStore(name){
        if(name==='drafts')return {
          get(){const req={};queueMicrotask(()=>{req.result=oldMeta;req.onsuccess&&req.onsuccess()});return req},
          put(meta){saved.meta=meta;finishWrite()}
        };
        if(name==='draftImages')return {
          index(){return {
            getAll(){const req={};queueMicrotask(()=>{req.result=[oldImage];req.onsuccess&&req.onsuccess()});return req},
            openCursor(){const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}
          }},
          put(image){saved.images.push(image)}
        };
        throw new Error('Unexpected store '+name);
      }
    };
  }
};
const state={groups:[{title:'User group',items:[]}],current:{title:"User's new section",items:[{file:new File(['new'],'new.jpg',{type:'image/jpeg',lastModified:2}),key:'new',caption:'New caption',rotate:0,addSeq:9}]},editing:-1,pages:[],pageDefs:[],driveRecordId:'',localDraftId:'',orientation:'portrait',per:6,addSeq:9};
const values={gdv:{value:'New GĐV',dataset:{custom:''},options:[{value:'New GĐV'}]},hoso:{value:'HS-NEW'},bks:{value:'NEW-PLATE'},garage:{value:'New garage'},date:{value:'2026-10-23'},title:{value:"User's new section"}};
const $=id=>values[id]||(values[id]={value:'',textContent:'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}}});
const api=global.PTI093DraftRecovery.install({
  state,$,getDateISO:()=>'2026-10-23',setDateInput:value=>{values.date.value=value||''},
  render:()=>{throw new Error('Recovery must not render over user changes')},
  renderLayout:()=>{throw new Error('Recovery must not render over user changes')},
  setDriveState:()=>{},msg:()=>{},
  openLocalDraftDB:async()=>{if(firstOpen){firstOpen=false;return await new Promise(resolve=>{resolveOpen=resolve})}return db},
  localDraftTransactionDone:async()=>{}
});
oldMeta.sessionId=session.get('pti093_work_session_id');
(async()=>{
  const beforeTitle=state.current.title;
  const beforeItems=state.current.items.slice();
  const restoring=api.restoreAutoDraft();
  assert.equal(typeof resolveOpen,'function','recovery should be waiting for the IndexedDB open');
  // Simulate the user typing and adding an image before the async restore finishes.
  values.hoso.value='HS-NEW-EDITED';
  state.current.title='User edited while recovery was waiting';
  state.current.items.push({file:new File(['later'],'later.jpg',{type:'image/jpeg',lastModified:3}),key:'later',caption:'Latest edit',rotate:180,addSeq:10});
  api.scheduleAutoDraftSave(true);
  resolveOpen(db);
  await restoring;
  await writeFinished;
  assert.equal(state.current.title,'User edited while recovery was waiting','old AUTO-DRAFT must not overwrite the active title');
  assert.equal(state.current.items.length,beforeItems.length+1,'newly added images must remain in the active workspace');
  assert.equal(state.current.items[0],beforeItems[0],'existing active image references must be preserved');
  assert.equal(values.hoso.value,'HS-NEW-EDITED','old form fields must not overwrite edits made during recovery');
  assert.equal(saved.meta.caseNumber,'HS-NEW-EDITED','the post-recovery save must persist the latest case fields');
  assert.ok(saved.images.some(image=>image.fileName==='later.jpg'),'the post-recovery save must include the image added during recovery');
  assert.ok(saved.closed>=2,'both recovery and post-recovery save connections should close');
  // Also cover the no-AUTO-DRAFT path where cleanup itself is asynchronous.
  const noDraftState={groups:[],current:{title:'Blank workspace',items:[]},editing:-1,pages:[],pageDefs:[],driveRecordId:'DRIVE-OLD',localDraftId:'LOCAL-OLD',orientation:'portrait',per:6,addSeq:0};
  const noDraftValues={gdv:{value:'GĐV mới',dataset:{custom:''},options:[{value:'GĐV mới'}]},hoso:{value:'HS-OLD'},bks:{value:'OLD'},garage:{value:'Old'},date:{value:'2026-10-23'},title:{value:'Blank workspace'}};
  const noDraft$=id=>noDraftValues[id]||(noDraftValues[id]={value:'',textContent:'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}}});
  let releaseCleanup,signalCleanupStarted,saveMetaResolve;
  const cleanupStarted=new Promise(resolve=>{signalCleanupStarted=resolve});
  const savedAfterCleanupPromise=new Promise(resolve=>{saveMetaResolve=resolve});
  const savedAfterCleanup={meta:null,images:[]};
  const noDraftDb={
    close(){},
    transaction(storeNames){
      return {objectStore(name){
        if(name==='drafts')return {
          get(){const req={};queueMicrotask(()=>{req.result=undefined;req.onsuccess&&req.onsuccess()});return req},
          delete(){},
          put(meta){savedAfterCleanup.meta=meta;saveMetaResolve(meta)}
        };
        if(name==='draftImages')return {
          index(){return {
            getAll(){const req={};queueMicrotask(()=>{req.result=[];req.onsuccess&&req.onsuccess()});return req},
            openCursor(){const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req}
          }},
          put(image){savedAfterCleanup.images.push(image)}
        };
        throw new Error('Unexpected store '+name);
      }};
    }
  };
  let transactionDoneCount=0;
  const noDraftApi=global.PTI093DraftRecovery.install({
    state:noDraftState,$:noDraft$,getDateISO:()=>'2026-10-23',setDateInput:value=>{noDraftValues.date.value=value||''},
    render:()=>{throw new Error('No-draft cleanup must not erase or rerender fresh user work')},
    renderLayout:()=>{throw new Error('No-draft cleanup must not erase or rerender fresh user work')},
    setDriveState:()=>{},msg:()=>{},openLocalDraftDB:async()=>noDraftDb,
    localDraftTransactionDone:async()=>{
      transactionDoneCount++;
      if(transactionDoneCount===1){
        signalCleanupStarted();
        await new Promise(resolve=>{releaseCleanup=resolve});
      }
    }
  });
  const noDraftRestore=noDraftApi.restoreAutoDraft();
  await cleanupStarted;
  noDraftValues.hoso.value='HS-NEW';
  noDraftValues.bks.value='NEW-PLATE';
  noDraftState.driveRecordId='DRIVE-NEW';
  noDraftState.localDraftId='LOCAL-NEW';
  noDraftState.current={title:'New user work',items:[{file:new File(['fresh'],'fresh.jpg',{type:'image/jpeg',lastModified:4}),key:'fresh',caption:'Fresh photo',rotate:0,addSeq:11}]};
  noDraftValues.title.value='New user work';
  noDraftApi.scheduleAutoDraftSave(true);
  releaseCleanup();
  await noDraftRestore;
  const savedAfterCleanupMeta=await savedAfterCleanupPromise;
  assert.equal(noDraftState.driveRecordId,'DRIVE-NEW','late no-draft cleanup must not clear a newly selected Drive ID');
  assert.equal(noDraftState.localDraftId,'LOCAL-NEW','late no-draft cleanup must not clear the active local draft ID');
  assert.equal(noDraftState.current.title,'New user work','late cleanup must preserve the new workspace');
  assert.equal(savedAfterCleanupMeta.caseNumber,'HS-NEW','new form fields should be saved after cleanup completes');
  assert.equal(savedAfterCleanupMeta.driveRecordId,'DRIVE-NEW','the post-cleanup autosave should persist the new Drive ID');
  assert.equal(savedAfterCleanupMeta.localDraftId,'LOCAL-NEW','the post-cleanup autosave should persist the new local draft ID');
  // Regression: autosave captures an old workspace, then yields while IndexedDB opens.
  // A workspace can change and release its lock before the DB promise resumes; revision
  // validation must still prevent the stale snapshot from being written.
  let releaseAutosaveDb, signalAutosaveDb;
  const autosaveDbOpening=new Promise(resolve=>{signalAutosaveDb=resolve});
  const autosaveDbGate=new Promise(resolve=>{releaseAutosaveDb=resolve});
  let staleWriteCount=0;
  const raceDb={close(){},transaction(){staleWriteCount++;throw new Error('stale autosave must not start a transaction')}};
  const raceState={groups:[],current:{title:'Old before open',items:[]},workspaceRevision:4,workspaceOpenPending:false,orientation:'portrait',per:6,driveRecordId:'',localDraftId:''};
  const raceValues={gdv:{value:'',dataset:{}},hoso:{value:'HS-OLD'},bks:{value:'OLD'},garage:{value:''},date:{value:'2026-10-23'},title:{value:'Old before open'}};
  const race$=id=>raceValues[id]||(raceValues[id]={value:'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}},textContent:''});
  const raceApi=global.PTI093DraftRecovery.install({
    state:raceState,$:race$,getDateISO:()=>'2026-10-23',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>{signalAutosaveDb();await autosaveDbGate;return raceDb},
    localDraftTransactionDone:async()=>{}
  });
  const staleSave=raceApi.saveAutoDraft();
  await autosaveDbOpening;
  raceState.workspaceOpenPending=true;
  raceState.workspaceRevision++;
  raceState.current={title:'New workspace',items:[]};
  raceValues.hoso.value='HS-NEW';
  raceValues.title.value='New workspace';
  raceState.workspaceOpenPending=false;
  releaseAutosaveDb();
  await staleSave;
  assert.equal(staleWriteCount,0,'autosave must recheck workspace revision after IndexedDB open and skip stale snapshot writes');

  console.log('Draft Recovery race regressions passed: edits during recovery and no-draft cleanup are preserved and saved.');
})().catch(error=>{console.error(error);process.exitCode=1});


(async()=>{
  const state={groups:[],current:{title:'Old workspace',items:[]},editing:-1,pages:[],pageDefs:[],driveRecordId:'DRIVE-OLD',localDraftId:'',driveOpenIncomplete:false,workspaceOpenPending:true,orientation:'portrait',per:6,addSeq:0};
  let openCalls=0;
  const api=global.PTI093DraftRecovery.install({
    state,$:id=>({value:id==='title'?'Old workspace':'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}},textContent:''}),
    getDateISO:()=> '2026-10-23',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>{openCalls++;throw new Error('should not open while workspace is pending')},
    localDraftTransactionDone:async()=>{},getLocalDrafts:async()=>[]
  });
  api.scheduleAutoDraftSave(true);
  await api.saveAutoDraft();
  await new Promise(resolve=>setTimeout(resolve,350));
  assert.equal(openCalls,0,'autosave must not persist a transient old workspace while another case is opening');
  console.log('Draft Recovery workspace-open lock regression passed (no transient AUTO-DRAFT writes).');
})().catch(error=>{console.error(error);process.exitCode=1});
