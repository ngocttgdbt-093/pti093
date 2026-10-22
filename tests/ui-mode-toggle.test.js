const assert=require('node:assert/strict');
const path=require.resolve('../skin/ui-mode-toggle.js');
function run({initial={},throwStorage=false,missing=false}={}){
  const data=new Map(Object.entries(initial));
  const style={disabled:false};
  const classes=[];
  const button={textContent:'',title:'',attrs:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this.attrs[name]=value;}};
  global.document={
    getElementById(id){if(missing)return null;return id==='uiRefreshV42'?style:id==='uiModeToggle'?button:null;},
    body:{classList:{toggle(name,on){classes.push([name,on]);}}}
  };
  global.localStorage={
    getItem(key){if(throwStorage)throw Error('storage blocked');return data.has(key)?data.get(key):null;},
    setItem(key,value){if(throwStorage)throw Error('storage blocked');data.set(key,String(value));}
  };
  delete require.cache[path];require(path);
  return {data,style,classes,button};
}
{
  const x=run();
  assert.equal(x.style.disabled,true,'Classic should be default');
  assert.equal(x.button.textContent,'Giao diện mới');
  assert.equal(x.button.attrs['aria-pressed'],'true');
  assert.equal(x.data.get('pti093_ui_mode'),'classic');
  assert.equal(x.data.get('pti093_ui_default_classic_v2'),'1');
  x.button.listeners.click();
  assert.equal(x.style.disabled,false);
  assert.equal(x.button.textContent,'Giao diện Classic');
  assert.equal(x.data.get('pti093_ui_mode'),'modern');
  x.button.listeners.click();
  assert.equal(x.style.disabled,true);
  assert.equal(x.data.get('pti093_ui_mode'),'classic');
}
{
  const x=run({initial:{pti093_ui_default_classic_v2:'1',pti093_ui_mode:'modern'}});
  assert.equal(x.style.disabled,false,'saved Modern choice should be preserved');
  assert.equal(x.button.textContent,'Giao diện Classic');
}
{
  const x=run({throwStorage:true});
  assert.equal(x.style.disabled,true,'storage failure should leave the safe Classic default');
  x.button.listeners.click();
  assert.equal(x.style.disabled,false,'toggle should still work when storage is blocked');
}
{
  run({missing:true});
}
delete global.document;delete global.localStorage;
console.log('UI Mode Toggle Skin tests passed (Classic default, persisted preference, toggle, and blocked storage).');
