const assert=require('node:assert/strict');
global.window=global;
require('../core/workspace.js');
require('../core/group-workflow.js');
assert.ok(global.PTI093GroupWorkflow);
function setup(){
  const events={renders:0,saves:[],messages:[],scrolls:[],previews:0,confirm:true,removed:0};
  const box={classList:{remove(){events.removed++;}}};
  const elements={
    title:{value:'Mục A'},
    filenameCaption:{checked:true,closest:()=>box},
    preview:{innerHTML:'old'},
    previewInfo:{textContent:'old info'},
    pdf:{disabled:false},
    backEdit:{style:{display:'inline-block'}},
    newCase:{style:{display:'inline-block'}},
    drop:{getBoundingClientRect:()=>({top:300})},
    saveNext:{onclick:null},
    finish:{onclick:null}
  };
  const state={groups:[],current:{title:'Mục cũ',items:[]},editing:-1,filenameCaption:true,pages:[],pageDefs:[]};
  const api=global.PTI093GroupWorkflow.install({
    state,$:id=>elements[id],workspaceCore:global.PTIWorkspaceCore,
    render:()=>events.renders++,makePreview:()=>events.previews++,
    scheduleAutoDraftSave:flag=>events.saves.push(flag),msg:(text,ok)=>events.messages.push({text,ok}),
    confirm:()=>events.confirm,window:{scrollY:50,scrollTo:opts=>events.scrolls.push(opts)}
  });
  return {api,state,elements,events};
}
(()=>{
  const {api,state,elements,events}=setup();
  const a={file:{name:'a.png'}},b={file:{name:'b.png'}};
  state.current={title:'Mục cũ',items:[a]};
  elements.title.value='Mục A';
  elements.saveNext.onclick();
  assert.equal(state.groups.length,1);
  assert.equal(state.groups[0].title,'Mục A');
  assert.equal(state.groups[0].items[0],a);
  assert.deepEqual(state.current,{title:'Mục A',items:[]});
  assert.equal(state.filenameCaption,false);
  assert.equal(elements.filenameCaption.checked,false);
  assert.deepEqual(events.saves,[true]);
  assert.match(events.messages[0].text,/Đã lưu “Mục A”/);

  state.current={title:'Mục cũ',items:[b]};
  elements.title.value='Mục B';
  elements.finish.onclick();
  assert.equal(state.groups.length,2);
  assert.equal(state.groups[1].title,'Mục B');
  assert.equal(elements.title.value,'Mục B');
  assert.deepEqual(state.current,{title:'Bản ảnh chi tiết thiệt hại',items:[]});
  assert.equal(events.previews,1);
  assert.equal(events.saves.length,2);

  api.editGroup(0);
  assert.equal(state.current.title,'Mục A');
  assert.equal(state.groups.length,1);
  assert.equal(state.editing,0);
  assert.equal(elements.title.value,'Mục A');
  assert.equal(elements.preview.innerHTML,'');
  assert.match(elements.previewInfo.textContent,/Preview cũ đã được hủy/);
  assert.equal(elements.pdf.disabled,true);
  assert.equal(elements.backEdit.style.display,'none');
  assert.equal(elements.newCase.style.display,'none');
  assert.equal(events.scrolls.at(-1).top,250);

  const currentBefore=state.current;
  events.confirm=false;
  api.editGroup(0);
  assert.equal(state.current,currentBefore,'cancel must preserve the current unsaved group');
  assert.equal(state.groups.length,1);

  events.confirm=true;
  api.editGroup(0);
  assert.equal(state.current.title,'Mục B');
  assert.equal(state.groups.length,0);
  assert.equal(state.editing,0);
  assert.equal(events.renders,4);
  assert.equal(events.saves.length,4);
  state.workspaceOpenPending=true;
  const pendingCurrent=state.current,pendingGroups=state.groups.slice(),pendingSaves=events.saves.length,pendingRenders=events.renders;
  api.saveNext();api.finish();api.editGroup(0);
  assert.equal(state.current,pendingCurrent,'group actions must not replace the workspace during open');
  assert.deepEqual(state.groups,pendingGroups,'group actions must not mutate the existing group list during open');
  assert.equal(events.saves.length,pendingSaves,'blocked group actions must not schedule autosave');
  assert.equal(events.renders,pendingRenders,'blocked group actions must not rerender stale workspace');

  // If the user has removed every image from a group being edited, the group is
  // still an uncommitted edit. Switching to another group must ask for confirmation.
  {
    const {api,state,events}=setup();
    state.groups=[{title:'Nhóm B',items:[{file:{name:'b.png'}}]}];
    state.current={title:'Nhóm A đang sửa',items:[]};
    state.editing=0;
    events.confirm=false;
    const beforeCurrent=state.current;
    api.editGroup(0);
    assert.equal(state.current,beforeCurrent,'cancel must preserve an empty in-progress group edit');
    assert.equal(state.current.title,'Nhóm A đang sửa');
    assert.equal(state.editing,0);
    assert.equal(state.groups[0].title,'Nhóm B','cancel must preserve the target saved group');
    assert.equal(events.renders,0,'cancel must not rerender or mutate the workspace');
  }
  console.log('Group Workflow Core tests passed (group lifecycle and workspace-open lock).');
})();
