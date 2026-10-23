const assert=require('node:assert/strict');
global.window=global;
require('../core/session-actions.js');
assert.ok(global.PTI093SessionActions);
function setup({gdv='Phạm Bá Lưu',custom='',storedCustom='',clearError=null}={}){
  const store=new Map([['pti093_driveRecordId','DRIVE-OLD']]);if(storedCustom)store.set('pti093_gdv_custom',storedCustom);
  const sessionStore=new Map([['pti093_driveRecordId','DRIVE-OLD']]);
  global.sessionStorage={
    getItem:key=>sessionStore.has(key)?sessionStore.get(key):null,
    setItem:(key,value)=>sessionStore.set(key,String(value)),
    removeItem:key=>sessionStore.delete(key)
  };
  const events={order:[],warnings:[],messages:[]};
  const state={workspaceOpenPending:false};
  const elements={gdv:{value:gdv,dataset:{custom}},newCase:{disabled:false,onclick:null}};
  const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
  const api=global.PTI093SessionActions.install({
    state,$:id=>elements[id],
    clearAutoDraft:async()=>{events.order.push('clear-start');assert.equal(state.workspaceOpenPending,true,'new-case cleanup must reserve the workspace before awaiting draft deletion');if(clearError)throw clearError;events.order.push('clear-done');},
    localStorage,location:{reload:()=>events.order.push('reload')},
    console:{warn:error=>events.warnings.push(error)},msg:text=>events.messages.push(text)
  });
  return {api,elements,localStorage,sessionStore,events,state};
}
(async()=>{
  {
    const {api,elements,localStorage,sessionStore,events,state}=setup();
    assert.equal(typeof elements.newCase.onclick,'function');
    await elements.newCase.onclick();
    assert.equal(localStorage.getItem('pti093_gdv'),'Phạm Bá Lưu');
    assert.equal(sessionStore.has('pti093_driveRecordId'),false,'starting a new case must clear the old session Drive record ID');
    assert.equal(localStorage.getItem('pti093_driveRecordId'),null,'starting a new case must clear the old persisted Drive record ID');
    assert.equal(elements.newCase.disabled,true);
    assert.equal(state.workspaceOpenPending,true,'workspace remains locked until page reload begins');
    assert.deepEqual(events.order,['clear-start','clear-done','reload']);
  }
  {
    const {api,localStorage,events}=setup({gdv:'Nhập tên khác',custom:'Tên tùy chỉnh'});
    await api.startNewCase();
    assert.equal(localStorage.getItem('pti093_gdv'),'Tên tùy chỉnh');
    assert.deepEqual(events.order,['clear-start','clear-done','reload']);
  }
  {
    const {api,elements,localStorage,sessionStore,events,state}=setup({gdv:'Nhập tên khác',storedCustom:'Tên đã lưu',clearError:new Error('cleanup failed')});
    const started=await api.startNewCase();
    assert.equal(started,false,'new case must not start when old draft cleanup fails');
    assert.equal(localStorage.getItem('pti093_gdv'),'Tên đã lưu');
    assert.equal(sessionStore.get('pti093_driveRecordId'),'DRIVE-OLD','failed cleanup must not alter the current Drive record identity');
    assert.equal(localStorage.getItem('pti093_driveRecordId'),'DRIVE-OLD','failed cleanup must not clear the persisted Drive record ID');
    assert.equal(elements.newCase.disabled,false,'allow retry after cleanup failure');
    assert.equal(state.workspaceOpenPending,false,'failed cleanup must release the workspace lock');
    assert.equal(events.warnings.length,1);
    assert.match(events.messages[0],/bản nháp cũ chưa được dọn/);
    assert.deepEqual(events.order,['clear-start'],'do not reload while the old auto-draft remains');
  }
  for(const gdvCase of [
    {value:'Phạm Bá Lưu',custom:''},
    {value:'Nhập tên khác',custom:''}
  ]){
    const order=[],messages=[];
    const elements={gdv:{value:gdvCase.value,dataset:{custom:gdvCase.custom}},newCase:{disabled:false,onclick:null}};
    const blockedStorage={getItem(){throw new Error('storage blocked')},setItem(){throw new Error('storage blocked')},removeItem(){throw new Error('storage blocked')}};
    global.sessionStorage={getItem(){throw new Error('session storage blocked')},setItem(){throw new Error('session storage blocked')},removeItem(){throw new Error('session storage blocked')}};
    const blockedApi=global.PTI093SessionActions.install({
      $:id=>elements[id],
      clearAutoDraft:async()=>{order.push('clear')},
      localStorage:blockedStorage,
      location:{reload:()=>order.push('reload')},
      console:{warn:()=>{}},msg:text=>messages.push(text)
    });
    await assert.doesNotReject(blockedApi.startNewCase(),'preference storage failure must not block starting a new case');
    assert.deepEqual(order,['clear','reload']);
    assert.equal(elements.newCase.disabled,true);
  }
  console.log('Session Actions Core tests passed (GĐV persistence, awaited draft cleanup, cleanup failure recovery, and blocked-storage recovery).');
})().catch(error=>{console.error(error);process.exitCode=1});
