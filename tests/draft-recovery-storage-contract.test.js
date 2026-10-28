const assert = require('node:assert/strict');
global.window=global;
const session=new Map();
global.sessionStorage={getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
require('../core/draft-recovery.js');

const elements={};
function $(id){
  return elements[id]||(elements[id]={value:id==='gdv'?'GĐV test':id==='title'?'Thiệt hại':'',dataset:{custom:''},textContent:'',disabled:false,style:{},classList:{add(){},remove(){},toggle(){}}});
}
const file={name:'damage.jpg',type:'image/jpeg',lastModified:123,size:12};
const item={file,key:'image-key',caption:'Mặt trước',rotate:0,addSeq:1,driveFileId:'DRIVE-1',driveFileName:'damage.jpg',driveUploadKey:'UPLOAD-1'};
const state={groups:[],current:{title:'Thiệt hại',items:[item]},editing:-1,driveRecordId:'DRIVE-CASE-1',driveOpenIncomplete:false,localCopyFromIncompleteDrive:false,localDraftId:'',orientation:'portrait',per:6,workspaceOpenPending:false,workspaceRevision:1,workspaceMutationRevision:1};
const calls={writeBundle:[],writeMetadata:[],readBundles:[],deleteBundle:[]};
const draftStorage={
  async writeBundle(meta,images){calls.writeBundle.push({meta,images})},
  async writeMetadata(meta){calls.writeMetadata.push(meta)},
  async readBundles(ids){calls.readBundles.push(ids);return Object.fromEntries(ids.map(id=>[id,{meta:null,images:[]}]))},
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
  console.log('Draft Recovery Storage Contract tests passed (image autosave, metadata-only autosave, delete).');
})().catch(error=>{console.error(error);process.exitCode=1});
