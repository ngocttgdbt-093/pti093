const assert=require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={
  getItem:key=>session.has(key)?session.get(key):null,
  setItem:(key,value)=>session.set(key,String(value)),
  removeItem:key=>session.delete(key)
};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.IDBKeyRange={only:value=>value};
global.File=class FakeFile{
  constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||0;this.size=10;this.data=parts[0]}
};
global.document={querySelectorAll(){throw new Error('Incomplete restore must stop before touching the UI')}};
require('../core/draft-recovery.js');

const activeItem={file:{name:'active.jpg',type:'image/jpeg',size:10},caption:'Active case photo',rotate:90,addSeq:7};
const state={
  groups:[{title:'Hồ sơ đang mở',items:[activeItem]}],
  current:{title:'Ảnh hiện tại',items:[]},editing:-1,pages:[],pageDefs:[],
  driveRecordId:'DRIVE-ACTIVE',localDraftId:'LOCAL-ACTIVE',
  orientation:'landscape',per:3,addSeq:7
};
const elements={};
const $=id=>elements[id]||(elements[id]={value:'',textContent:'',dataset:{},options:[],classList:{add(){},remove(){},toggle(){}}});
const meta={
  id:'AUTO-DRAFT',auto:true,sessionId:'',caseNumber:'HS-PARTIAL',bks:'30A-PARTIAL',
  sections:[
    {title:'Hiện trường',isCurrent:false,items:[
      {fileName:'one.jpg',type:'image/jpeg',lastModified:1,key:'one',caption:'Ảnh một',rotate:0,addSeq:1},
      {fileName:'two.jpg',type:'image/jpeg',lastModified:2,key:'two',caption:'Ảnh hai',rotate:90,addSeq:2}
    ]}
  ]
};
const storedImages=[{sectionIndex:0,itemIndex:0,file:{bytes:'one'},fileName:'one.jpg',type:'image/jpeg',lastModified:1}];
const db={
  close(){},
  transaction(storeNames){
    const hasStore=name=>Array.isArray(storeNames)?storeNames.includes(name):storeNames===name;
    if(hasStore('drafts')||hasStore('draftImages'))return {objectStore:name=>{
      if(name==='drafts')return {get(id){const req={};queueMicrotask(()=>{req.result=id===meta.id?meta:undefined;req.onsuccess&&req.onsuccess()});return req}};
      if(name==='draftImages')return {index:()=>({getAll(range){const req={};queueMicrotask(()=>{req.result=range===meta.id?storedImages:[];req.onsuccess&&req.onsuccess()});return req}})};
      throw new Error('Unexpected object store: '+name);
    }};
    throw new Error('Unexpected store: '+storeNames);
  }
};
const messages=[],statuses=[];
const api=global.PTI093DraftRecovery.install({
  state,$,getDateISO:()=> '2026-10-23',setDateInput:()=>{},
  render:()=>{throw new Error('Must not render partial AUTO-DRAFT')},
  renderLayout:()=>{throw new Error('Must not render partial AUTO-DRAFT')},
  setDriveState:(...args)=>statuses.push(args),msg:text=>messages.push(text),
  openLocalDraftDB:async()=>db,localDraftTransactionDone:async()=>{}
});
meta.sessionId=session.get('pti093_work_session_id');
(async()=>{
  const before=JSON.stringify(state);
  const warnings=[];const oldWarn=console.warn;console.warn=(...args)=>warnings.push(args);
  try{await api.restoreAutoDraft()}finally{console.warn=oldWarn}
  assert.equal(JSON.stringify(state),before,'incomplete AUTO-DRAFT must not mutate the active case');
  assert.equal($('hoso').value,'','incomplete AUTO-DRAFT must not overwrite case fields');
  assert.ok(messages.some(m=>/thiếu dữ liệu của 1\/2 ảnh/.test(m)),'user should receive the missing-image count');
  assert.ok(messages.some(m=>/hồ sơ đang mở không bị thay đổi/.test(m)),'user should be told the active case is preserved');
  assert.equal(warnings.length,0,'a recoverable incomplete draft should be reported without an unhandled warning');
  console.log('AUTO-DRAFT incomplete recovery regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
