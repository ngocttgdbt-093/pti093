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
  console.log('Draft Recovery race regression passed: user edits during IndexedDB recovery are preserved and saved.');
})().catch(error=>{console.error(error);process.exitCode=1});
