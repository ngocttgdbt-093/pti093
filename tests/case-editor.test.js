const assert=require('node:assert/strict');
global.window=global;
require('../core/case-editor.js');
const elements={};
function element(id){
  if(!elements[id]){
    elements[id]={
      value:'',checked:false,listeners:{},
      addEventListener(type,fn){this.listeners[type]=fn;},
      closest(){return {classList:{toggle(name,on){elements.boxClass=on;}}};}
    };
  }
  return elements[id];
}
const state={current:{title:'Bản ảnh',items:[{file:{name:'photo-01.jpg'},caption:'old'},{file:{name:'document.png'},caption:'old2'}]},filenameCaption:false};
const events={saves:[],renders:0,messages:[]};
const api=global.PTI093CaseEditor.install({
  state,$:element,fileBaseName:name=>name.replace(/\.[^.]+$/,''),
  render:()=>events.renders++,scheduleAutoDraftSave:value=>events.saves.push(value),
  msg:(text,ok)=>events.messages.push({text,ok})
});
api.bindControls();
element('title').value='Hồ sơ 123';
element('title').listeners.change();
assert.equal(state.current.title,'Hồ sơ 123');
assert.deepEqual(events.saves,[false]);
element('filenameCaption').checked=true;
element('filenameCaption').listeners.change({target:element('filenameCaption')});
assert.equal(state.filenameCaption,true);
assert.deepEqual(state.current.items.map(item=>item.caption),['photo-01','document']);
assert.equal(events.renders,1);
assert.deepEqual(events.saves,[false,false]);
assert.equal(elements.boxClass,true);
element('filenameCaption').checked=false;
element('filenameCaption').listeners.change({target:element('filenameCaption')});
assert.equal(state.filenameCaption,false);
assert.equal(events.saves.length,2);
assert.equal(events.messages.length,2);
console.log('Case Editor Core tests passed (title updates, filename captions, render, and autosave semantics).');


state.workspaceOpenPending=true;
const titleBefore=state.current.title,savesBefore=events.saves.length,rendersBefore=events.renders;
element('title').value='Stale title while opening';
element('title').listeners.change();
assert.equal(state.current.title,titleBefore,'title edits must not mutate the old workspace during open');
assert.equal(element('title').value,titleBefore,'the old title input should be restored while opening');
element('filenameCaption').checked=true;
element('filenameCaption').listeners.change({target:element('filenameCaption')});
assert.equal(state.filenameCaption,false,'filename-caption mode must not change while opening');
assert.equal(events.saves.length,savesBefore,'blocked case-editor changes must not autosave');
assert.equal(events.renders,rendersBefore,'blocked case-editor changes must not rerender');
console.log('Case Editor workspace-open lock regression passed.');
