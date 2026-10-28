const assert = require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
require('../core/draft-recovery.js');

const elements={};
function $(id){
  return elements[id]||(elements[id]={value:id==='gdv'?'GĐV test':id==='title'?'Thiệt hại':'',options:[],dataset:{custom:''},textContent:'',disabled:false,style:{},classList:{add(){},remove(){},toggle(){}}});
}
const file={name:'damage.jpg',type:'image/jpeg',lastModified:123,size:12};
const item={file,key:'image-key',caption:'Mặt trước',rotate:0,addSeq:1,driveFileId:'DRIVE-1',driveFileName:'damage.jpg',driveUploadKey:'UPLOAD-1'};
const state={groups:[],current:{title:'Thiệt hại',items:[item]},editing:-1,driveRecordId:'DRIVE-CASE-1',driveOpenIncomplete:false,localCopyFromIncompleteDrive:false,localDraftId:'',orientation:'portrait',per:6,workspaceOpenPending:false,workspaceRevision:1,workspaceMutationRevision:1};
const calls={writeBundle:[],writeMetadata:[],readBundles:[],deleteBundle:[]};
let restoreLegacy=null;
const draftStorage={
  async writeBundle(meta,images){calls.writeBundle.push({meta,images})},
  async writeMetadata(meta){calls.writeMetadata.push(meta)},
  async readBundles(ids){calls.readBundles.push(ids);return Object.fromEntries(ids.map(id=>[id,id==='AUTO-DRAFT'&&restoreLegacy?restoreLegacy:{meta:null,images:[]}]))},
  async deleteBundle(id){calls.deleteBundle.push(id)}
};
const api=global.PTI093DraftRecovery.install({
  state,$,getDateISO:()=> '2026-10-29',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},
  setDriveState:()=>{},msg:()=>{},openLocalDraftDB:async()=>{throw new Error('contract path must not open IndexedDB directly')},
  localDraftTransactionDone:async()=>{throw new Error('contract path must not create direct transactions')},
  draftStorage,fileKey:()=> 'image-key'
});

(async()=>{
  await api.saveAutoDraft();
  assert.equal(calls.writeBundle.length,1,'first autosave should persist metadata and image blobs through writeBundle');
  assert.equal(calls.writeBundle[0].meta.auto,true);
  assert.equal(calls.writeBundle[0].images.length,1);
  assert.equal(calls.writeBundle[0].images[0].draftId,calls.writeBundle[0].meta.id);

  api.scheduleAutoDraftSave(false);
  api.clearAutoDraftTimer();
  await api.saveAutoDraft();
  assert.equal(calls.writeMetadata.length,1,'metadata-only autosave must not rewrite image blobs');
  assert.equal(calls.writeBundle.length,1);

  await api.clearAutoDraft();
  assert.equal(calls.deleteBundle.length,1,'clear autosave should use the storage contract');
  assert.match(calls.deleteBundle[0],/^AUTO-DRAFT-/);

  // Restore a legacy AUTO-DRAFT owned by this same session when the session-specific ID is absent.
  const sessionId=session.get('pti093_work_session_id');
  class MockFile{constructor(parts,name,options={}){this.name=name;this.type=options.type||'image/jpeg';this.lastModified=options.lastModified||1;this.size=parts[0]&&parts[0].size||12}}
  global.File=MockFile;global.document={querySelectorAll:()=>[]};
  const legacyFile=new MockFile([{size:12}],'legacy.jpg',{type:'image/jpeg',lastModified:77});
  restoreLegacy={meta:{id:'AUTO-DRAFT',sessionId,caseNumber:'CASE-LEGACY',bks:'30A-12345',garage:'Garage',date:'2026-10-29',gdv:'GĐV test',currentTitle:'Legacy title',editing:-1,settings:{orientation:'portrait',imagesPerPage:6},sections:[{title:'Legacy group',isCurrent:true,items:[{fileName:'legacy.jpg',type:'image/jpeg',lastModified:77,key:'legacy-key',caption:'Legacy caption',rotate:0,addSeq:1}]}]},images:[{draftId:'AUTO-DRAFT',sectionIndex:0,itemIndex:0,file:legacyFile,fileName:'legacy.jpg',type:'image/jpeg',lastModified:77}]};
  await api.restoreAutoDraft();
  assert.equal(calls.readBundles.length,1,'restore should request active and legacy IDs through one contract call');
  assert.deepEqual(calls.readBundles[0],[calls.readBundles[0][0],'AUTO-DRAFT']);
  assert.equal(state.current.title,'Legacy group');
  assert.equal(state.current.items[0].caption,'Legacy caption');
  assert.equal(state.current.items[0].file.name,'legacy.jpg');
  assert.equal(state.driveRecordId,'');
  console.log('Draft Recovery Storage Contract tests passed (image autosave, metadata-only autosave, delete, same-session legacy restore).');
})().catch(error=>{console.error(error);process.exitCode=1});
