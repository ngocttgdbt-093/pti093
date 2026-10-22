const assert=require('node:assert/strict');
const path=require.resolve('../fusion/drive-recovery-guard.js');
function setup({uploadAvailable=false,includeStrayText=false}={}){
  const stateNode={textContent:'Trạng thái ban đầu',classList:{removed:[],remove(name){this.removed.push(name);}}};
  const create={listeners:{},addEventListener(name,fn,capture){this.listeners[name]={fn,capture};}};
  const stray={children:[],textContent:'/* Search results: responsive record cards legacy residue */',removed:false,remove(){this.removed=true;}};
  global.window=global;
  if(uploadAvailable)global.pti093UploadAll=()=>({});else delete global.pti093UploadAll;
  global.document={
    getElementById(id){return id==='driveState'?stateNode:id==='driveCreate'?create:null;},
    querySelectorAll(){return includeStrayText?[stray]:[];}
  };
  global.setTimeout=fn=>{fn();return 1;};
  delete require.cache[path];require(path);
  return {stateNode,create,stray};
}
{
  const x=setup();
  assert.equal(typeof x.create.listeners.click.fn,'function');
  assert.equal(x.create.listeners.click.capture,true,'guard should run in capture phase');
  x.create.listeners.click.fn();
  assert.match(x.stateNode.textContent,/Lỗi khởi chạy chức năng tải ảnh Drive/);
  assert.deepEqual(x.stateNode.classList.removed,['hidden']);
}
{
  const x=setup({uploadAvailable:true,includeStrayText:true});
  x.create.listeners.click.fn();
  assert.equal(x.stateNode.textContent,'Trạng thái ban đầu','valid upload entry should not show a false error');
  assert.equal(x.stray.removed,true,'legacy CSS residue should be removed when present');
}
delete global.window;delete global.document;delete global.setTimeout;delete global.pti093UploadAll;
console.log('Drive Recovery Guard tests passed (capture-phase upload guard and stale text cleanup).');
