const assert=require('node:assert/strict');
global.window=global;
const previousDocument=global.document;
const previousSetTimeout=global.setTimeout;
const previousWarn=console.warn;
global.sessionStorage=new Map();
global.sessionStorage.getItem=function(key){return this.has(key)?this.get(key):null};
global.sessionStorage.setItem=function(key,value){this.set(key,String(value))};
global.sessionStorage.removeItem=function(key){this.delete(key)};
global.document={visibilityState:'visible',addEventListener(){}};
global.addEventListener=()=>{};
console.warn=()=>{};
let timerId=0;
global.setTimeout=()=>++timerId;
const elements={};
function makeElement(value){
  const listeners={};
  return {value,dataset:{custom:''},listeners,addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)},fire(type,event={preventDefault(){this.prevented=true}}){for(const fn of listeners[type]||[])fn(event);return event}};
}
for(const [id,value] of Object.entries({bks:'OLD-PLATE',hoso:'OLD-CASE',gdv:'GĐV A',date:'23/10/2026',garage:'Old garage'}))elements[id]=makeElement(value);
const state={groups:[],current:{title:'Blank',items:[]},workspaceOpenPending:false,workspaceMutationRevision:0};
const api=global.PTI093DraftRecovery.install({
  state,$:id=>elements[id]||makeElement(''),getDateISO:()=>'',setDateInput:()=>{},render:()=>{},renderLayout:()=>{},
  setDriveState:()=>{},msg:()=>{},openLocalDraftDB:async()=>{throw new Error('No storage needed in this guard test')},
  localDraftTransactionDone:async()=>{}
});
api.bindLifecycle();
const bks=elements.bks;
bks.fire('focus');
state.workspaceOpenPending=true;
const before=bks.fire('beforeinput');
assert.equal(before.prevented,true,'beforeinput must be cancelled while a workspace transition is locked');
bks.value='UNWANTED-EDIT';
bks.fire('input');
assert.equal(bks.value,'OLD-PLATE','input fallback must restore the last stable field value during a lock');
assert.equal(state.workspaceMutationRevision,0,'rejected input must not mark workspace content dirty');
const gdv=elements.gdv;
gdv.fire('focus');
gdv.value='Nhập tên khác';
gdv.fire('change');
assert.equal(gdv.value,'GĐV A','select changes during a lock must restore the focused stable value');
state.workspaceOpenPending=false;
bks.value='NEW-PLATE';
bks.fire('input');
assert.equal(state.workspaceMutationRevision,1,'accepted metadata edits must advance content revision');
global.setTimeout=previousSetTimeout;
console.warn=previousWarn;
if(previousDocument===undefined)delete global.document;else global.document=previousDocument;
console.log('Workspace lock form-input guard tests passed.');
