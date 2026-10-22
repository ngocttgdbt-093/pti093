const assert=require('node:assert/strict');
global.window=global;
require('../core/case-editor.js');
const handlers={},elements={};
function element(id){
  if(!elements[id])elements[id]={value:'',checked:false,classes:new Set(),listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},closest(){return {classList:{toggle:(name,on)=>{elements.boxClass=on;}};}};
  return elements[id];
}
const state={current:{title:'Bản ảnh',items:[{file:{name:'photo-01.jpg'},caption:'old'},{file:{name:'document.png'},caption:'old2'}]},filenameCaption:false};
const events={saves:[],renders:0,messages:[]};
const api=global.PTI093CaseEditor.install({state,$:element,fileBaseName:name=>name.replace(/\.[^.]+$/,''),render:()=>events.renders++,scheduleAutoDraftSave:value=>events.saves.push(value),msg:(text,ok)=>events.messages.push({text,ok})});
api.bindControls();
element('title').value='Hồ sơ 123';element('title').listeners.change();
assert.equal(state.current.title,'Hồ sơ 123');
assert.deepEqual(events.saves,[false]);
element('filenameCaption').checked=true;element('filenameCaption').listeners.change({target:element('filenameCaption')});
assert.equal(state.filenameCaption,true);
assert.deepEqual(state.current.items.map(item=>item.caption),['photo-01','document']);
assert.equal(events.renders,1);assert.deepEqual(events.saves,[false,false]);assert.equal(elements.boxClass,true);
element('filenameCaption').checked=false;element('filenameCaption').listeners.change({target:element('filenameCaption')});
assert.equal(state.filenameCaption,false);assert.equal(events.saves.length,2);assert.equal(events.messages.length,2);
console.log('Case Editor Core tests passed (title updates, filename captions, render, and autosave semantics).');
