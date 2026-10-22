const assert=require('node:assert/strict');
global.window=global;
require('../core/session-actions.js');
assert.ok(global.PTI093SessionActions);
function setup({gdv='Phạm Bá Lưu',custom='',storedCustom='',clearError=null}={}){
  const store=new Map();if(storedCustom)store.set('pti093_gdv_custom',storedCustom);
  const events={order:[],warnings:[]};
  const elements={gdv:{value:gdv,dataset:{custom}},newCase:{disabled:false,onclick:null}};
  const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
  const api=global.PTI093SessionActions.install({
    $:id=>elements[id],
    clearAutoDraft:async()=>{events.order.push('clear-start');if(clearError)throw clearError;events.order.push('clear-done');},
    localStorage,location:{reload:()=>events.order.push('reload')},
    console:{warn:error=>events.warnings.push(error)}
  });
  return {api,elements,localStorage,events};
}
(async()=>{
  {
    const {api,elements,localStorage,events}=setup();
    assert.equal(typeof elements.newCase.onclick,'function');
    await elements.newCase.onclick();
    assert.equal(localStorage.getItem('pti093_gdv'),'Phạm Bá Lưu');
    assert.equal(elements.newCase.disabled,true);
    assert.deepEqual(events.order,['clear-start','clear-done','reload']);
  }
  {
    const {api,localStorage,events}=setup({gdv:'Nhập tên khác',custom:'Tên tùy chỉnh'});
    await api.startNewCase();
    assert.equal(localStorage.getItem('pti093_gdv'),'Tên tùy chỉnh');
    assert.deepEqual(events.order,['clear-start','clear-done','reload']);
  }
  {
    const {api,localStorage,events}=setup({gdv:'Nhập tên khác',storedCustom:'Tên đã lưu',clearError:new Error('cleanup failed')});
    await api.startNewCase();
    assert.equal(localStorage.getItem('pti093_gdv'),'Tên đã lưu');
    assert.equal(events.warnings.length,1);
    assert.deepEqual(events.order,['clear-start','reload'],'reload should still happen if draft cleanup fails');
  }
  console.log('Session Actions Core tests passed (GĐV persistence, awaited draft cleanup, and cleanup failure recovery).');
})().catch(error=>{console.error(error);process.exitCode=1});
