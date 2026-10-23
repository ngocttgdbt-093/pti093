const assert=require('node:assert/strict');
global.window=global;
require('../core/image-editing.js');
assert.ok(global.PTI093ImageEditing);
function setup(){
  const listeners={},elements={};
  for(const id of ['clear','insertFile','replaceFile']){
    elements[id]={value:'chosen',files:[],clickCount:0,addEventListener:(name,fn)=>{listeners[id+':'+name]=fn;},click(){this.clickCount++;}};
  }
  const state={current:{items:[{file:{name:'old.png'},key:'old.png|3|1',caption:'caption to keep',rotate:270,addSeq:1,driveFileId:'OLD-DRIVE-ID',driveFileName:'old.png',driveUploadKey:'old-upload-key'}]},addSeq:1,insertIndex:-1,replaceIndex:-1,filenameCaption:false};
  const events={renders:0,saves:[],messages:[],confirm:true};
  const api=global.PTI093ImageEditing.install({
    state,$:id=>elements[id],exts:/\.(jpe?g|png|webp|gif|heic|heif)$/i,
    fileBaseName:name=>name.replace(/\.[^.]+$/,''),
    render:()=>events.renders++,scheduleAutoDraftSave:images=>events.saves.push(images),
    msg:(text,ok)=>events.messages.push({text,ok}),confirm:()=>events.confirm
  });
  return {api,state,elements,listeners,events};
}
const file=(name,type='image/png',size=3,lastModified=1)=>({name,type,size,lastModified});
const key=f=>f.name+'|'+f.size+'|'+f.lastModified;
(()=>{
  const {api,state,elements,listeners,events}=setup();
  api.beginInsert(0);
  assert.equal(state.insertIndex,0);assert.equal(elements.insertFile.clickCount,1);
  const fresh=file('new.png','image/png',4,2);
  const invalid=file('note.txt','text/plain',1,1);
  elements.insertFile.files=[fresh,file('old.png','image/png',3,1),fresh,invalid];
  listeners['insertFile:change']({target:elements.insertFile});
  assert.equal(elements.insertFile.value,'');assert.equal(state.insertIndex,-1);
  assert.deepEqual(state.current.items.map(x=>x.file.name),['old.png','new.png']);
  assert.equal(state.current.items[1].key,key(fresh));assert.equal(state.current.items[1].caption,'');
  assert.equal(state.current.items[1].addSeq,2);assert.equal(state.current.items[1].rotate,0);
  assert.deepEqual(events.saves,[true]);assert.match(events.messages.at(-1).text,/Đã chèn 1 ảnh sau ảnh số 1/);

  state.filenameCaption=true;
  api.beginInsert(0);
  const third=file('third.jpg','image/jpeg',5,3);
  elements.insertFile.files=[third];listeners['insertFile:change']({target:elements.insertFile});
  assert.deepEqual(state.current.items.map(x=>x.file.name),['old.png','third.jpg','new.png']);
  assert.equal(state.current.items[1].caption,'third');

  api.beginReplace(0);
  elements.replaceFile.files=[fresh];listeners['replaceFile:change']({target:elements.replaceFile});
  assert.equal(state.current.items[0].file.name,'old.png','duplicate replacement should not change the item');
  assert.match(events.messages.at(-1).text,/Ảnh này đã có/);

  state.filenameCaption=false;
  api.beginReplace(0);
  const replacement=file('replacement.png','image/png',8,9);
  elements.replaceFile.files=[replacement];listeners['replaceFile:change']({target:elements.replaceFile});
  assert.equal(state.current.items[0].file.name,'replacement.png');
  assert.equal(state.current.items[0].caption,'caption to keep');
  assert.equal(state.current.items[0].rotate,270);
  assert.equal(state.current.items[0].addSeq,1);
  assert.equal(state.current.items[0].key,key(replacement));
  assert.equal(state.current.items[0].driveFileId,'','replaced image must not retain the old Drive file ID');
  assert.equal(state.current.items[0].driveFileName,'','replaced image must not retain the old Drive filename');
  assert.equal(state.current.items[0].driveUploadKey,'','replaced image must not retain the old upload key');

  api.rotate(state.current.items[0],0);
  assert.equal(state.current.items[0].rotate,0);
  api.captionChange(state.current.items[0],'new caption');
  assert.equal(state.current.items[0].caption,'new caption');
  api.deleteCurrent(1);
  assert.equal(state.current.items.length,2);
  assert.deepEqual(events.saves.slice(-3),[true,false,true]);

  api.beginInsert(0);
  const folderA={...file('scene.jpg','image/jpeg',12,34),webkitRelativePath:'folderA/scene.jpg'};
  const folderB={...file('scene.jpg','image/jpeg',12,34),webkitRelativePath:'folderB/scene.jpg'};
  elements.insertFile.files=[folderA,folderB];listeners['insertFile:change']({target:elements.insertFile});
  assert.equal(state.current.items.length,4,'same-name files from different folders must both be insertable');
  assert.notEqual(state.current.items[1].key,state.current.items[2].key,'folder path must distinguish inserted file keys');

  events.confirm=false;api.clearCurrent();assert.equal(state.current.items.length,4);
  events.confirm=true;api.clearCurrent();assert.equal(state.current.items.length,0);
  assert.equal(events.saves.at(-1),true);
  assert.equal(events.renders,7);
  console.log('Image Editing Core tests passed (insert/replace/dedupe/caption/rotation/delete/clear and autosave semantics).');
})();
