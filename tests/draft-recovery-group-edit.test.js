const assert=require('node:assert/strict');
global.window=global;
global.IDBKeyRange={only:value=>value};
global.File=class FakeFile{
  constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||0;this.size=options.size||10;this.data=parts[0]}
};
global.document={querySelectorAll(){return []}};
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
require('../core/draft-recovery.js');

(async()=>{
  let meta=null;
  let images=[];
  const db={
    close(){},
    transaction(storeNames){
      const stores=Array.isArray(storeNames)?storeNames:[storeNames];
      return {
        objectStore(name){
          if(name==='drafts')return {
            put(value){meta=JSON.parse(JSON.stringify(value))},
            get(id){const req={};queueMicrotask(()=>{req.result=meta&&meta.id===id?meta:undefined;req.onsuccess&&req.onsuccess()});return req}
          };
          if(name==='draftImages')return {
            put(value){images=images.filter(x=>x.id!==value.id);images.push(value)},
            index(){return {
              openCursor(){
                const req={};queueMicrotask(()=>{req.result=null;req.onsuccess&&req.onsuccess()});return req
              },
              getAll(range){
                const req={};queueMicrotask(()=>{req.result=images.filter(x=>x.draftId===range);req.onsuccess&&req.onsuccess()});return req
              }
            }}
          };
          throw new Error('Unexpected store '+name+' ('+stores.join(',')+')');
        }
      };
    }
  };
  const values={
    gdv:{value:'GĐV A',dataset:{custom:''},options:[{value:'GĐV A'}]},
    hoso:{value:'HS-01'},bks:{value:'30A-12345'},garage:{value:'Garage A'},
    date:{value:'23/10/2026'},title:{value:'Nhóm A đang sửa'},
    driveId:{textContent:'',classList:{remove(){}}}
  };
  const imageB={file:{name:'b.jpg',type:'image/jpeg',size:10,lastModified:1},key:'b-key',caption:'Ảnh B',rotate:90,addSeq:4};
  const state={
    groups:[{title:'Nhóm B',items:[imageB]}],
    current:{title:'Nhóm A đang sửa',items:[]},editing:0,
    pages:[{old:true}],pageDefs:[{old:true}],workspaceRevision:2,workspaceMutationRevision:3,
    orientation:'landscape',per:3,addSeq:4,driveRecordId:'',localDraftId:''
  };
  const api=global.PTI093DraftRecovery.install({
    state,$:id=>values[id]||(values[id]={value:'',textContent:'',dataset:{},options:[],classList:{remove(){}}}),
    getDateISO:()=> '2026-10-23',setDateInput:value=>{values.date.value=value||''},
    render:()=>{},renderLayout:()=>{},setDriveState:()=>{},msg:()=>{},
    openLocalDraftDB:async()=>db,
    localDraftTransactionDone:async()=>{}
  });
  const originalSetTimeout=global.setTimeout;
  global.setTimeout=()=>1;
  try{
    await api.saveAutoDraft();
    assert.ok(meta,'autosave should write draft metadata');
    assert.deepEqual(meta.sections.map(g=>g.title),['Nhóm A đang sửa','Nhóm B'],
      'edited current group must be inserted at its original index, not appended');
    assert.equal(meta.sections[0].isCurrent,true);
    assert.equal(meta.sections[0].items.length,0,'an empty edited group must remain in the draft');
    assert.equal(meta.editing,0,'autosave must persist the original edit index');

    // Reset working state and restore the saved draft, as after F5.
    state.groups=[];state.current={title:'Blank',items:[]};state.editing=-1;
    state.pages=[{stale:true}];state.pageDefs=[{stale:true}];
    await api.restoreAutoDraft();
    assert.deepEqual(state.groups.map(g=>g.title),['Nhóm B'],'other saved groups must retain their order');
    assert.equal(state.current.title,'Nhóm A đang sửa','the empty in-progress group must be recovered');
    assert.equal(state.current.items.length,0);
    assert.equal(state.editing,0,'editing state must survive reload');
    assert.equal(state.groups[0].items[0].caption,'Ảnh B','other group image metadata must be retained');
    console.log('AUTO-DRAFT edited-group order/empty-group recovery regression passed.');
  }finally{global.setTimeout=originalSetTimeout}
})().catch(error=>{console.error(error);process.exitCode=1});
