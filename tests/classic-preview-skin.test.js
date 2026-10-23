const assert=require('node:assert/strict');
global.window=global;
require('../skin/classic-preview.js');
assert.ok(global.PTI093ClassicPreviewSkin);
function setup(groups,options={}){
  const elements={
    backEdit:{style:{display:'inline-block'},onclick:null},
    newCase:{style:{display:'inline-block'}},
    preview:{innerHTML:'old preview',children:[],appendChild(node){this.children.push(node);},getBoundingClientRect:()=>({top:200})},
    previewInfo:{textContent:''},
    pdf:{disabled:true},
    drop:{getBoundingClientRect:()=>({top:300})}
  };
  const events={selected:'',hidden:0,messages:[],scroll:null,buildArgs:null};
  const state={per:2,pages:['old'],pageDefs:['old defs'],workspaceOpenPending:!!options.workspaceOpenPending,workspaceRevision:options.workspaceRevision};
  const doc={body:{style:{overflow:'hidden'}},createElement:tag=>({tag,className:'',textContent:'',children:[],append(...nodes){this.children.push(...nodes);}})};
  const win={scrollY:100,scrollTo:opts=>{events.scroll=opts;},pti093ClosePreview:()=>{events.closed=(events.closed||0)+1;}};
  const api=global.PTI093ClassicPreviewSkin.install({
    state,$:id=>elements[id],document:doc,window:win,
    buildPreview:options.buildPreview||async(gs,per)=>{events.buildArgs={gs,per};return {pages:[{id:'page1'},{id:'page2'}],defs:[{pageNo:1},{pageNo:2}],totalImages:3};},
    getAllGroups:()=>groups,selectedGdv:()=> 'GĐV thử',
    setSelectedGdvCache:value=>{events.selected=value;},
    hidePdfWarning:()=>{events.hidden++;},msg:(text,ok)=>events.messages.push({text,ok}),
    pagePixels:()=>({dpi:150}),jpegQuality:()=>0.8,setTimeout:fn=>{fn();return 1;}
  });
  return {api,elements,events,state,doc};
}
(async()=>{
  {
    const groups=[{title:'Hiện trường',items:[{},{ }]},{title:'Giấy tờ',items:[{}]}];
    const {api,elements,events,state,doc}=setup(groups);
    await api.makePreview();
    assert.equal(events.selected,'GĐV thử');
    assert.equal(events.hidden,1);
    assert.equal(events.buildArgs.gs,groups);
    assert.equal(events.buildArgs.per,2);
    assert.deepEqual(state.pages,[{id:'page1'},{id:'page2'}],'rendered pages must be stored for PDF export');
    assert.deepEqual(state.pageDefs,[{pageNo:1},{pageNo:2}]);
    assert.equal(elements.preview.children.length,2);
    assert.equal(elements.preview.children[0].className,'pageprev');
    assert.equal(elements.preview.children[0].children[0].textContent,'Trang 1');
    assert.match(elements.previewInfo.textContent,/Preview 2 trang A4 · 2 nội dung · 3 ảnh/);
    assert.match(elements.previewInfo.textContent,/150 DPI \/ JPEG 80%/);
    assert.equal(elements.pdf.disabled,false);
    assert.equal(elements.backEdit.style.display,'none');
    assert.equal(elements.newCase.style.display,'inline-block');
    assert.equal(events.scroll.top,220);
    elements.backEdit.onclick();
    assert.equal(events.closed,1,'back-to-edit should close the full-screen preview when available');
    assert.equal(doc.body.style.overflow,'','back-to-edit should release body scroll lock');
    assert.equal(events.scroll.top,300,'back-to-edit should scroll to the editor area');
    assert.match(events.messages.at(-1).text,/Đã quay lại hồ sơ hiện tại/);
  }
  {
    const {api,elements,events,state}=setup([]);
    await api.makePreview();
    assert.equal(state.pages[0],'old','empty preview should not overwrite existing pages');
    assert.equal(elements.preview.children.length,0);
    assert.match(events.messages[0].text,/Chưa có ảnh để Preview/);
  }
  {
    const groups=[{title:'Hồ sơ cũ',items:[{caption:'Ảnh cũ',rotate:0,key:'old',file:{id:'old'}}]}];
    const {api,elements,events,state}=setup(groups,{workspaceOpenPending:true});
    await api.makePreview();
    assert.equal(events.buildArgs,null,'preview build must not start while another workspace is opening');
    assert.deepEqual(state.pages,['old']);
    assert.equal(elements.backEdit.style.display,'inline-block','blocked preview must not alter editor controls');
    assert.equal(elements.newCase.style.display,'inline-block');
  }
  {
    const groups=[{title:'Hồ sơ cũ',items:[{caption:'Ảnh cũ',rotate:0,key:'old',file:{id:'old'}}]}];
    let resolveBuild;
    const buildPreview=()=>new Promise(resolve=>{resolveBuild=resolve;});
    const {api,elements,events,state}=setup(groups,{buildPreview});
    const pending=api.makePreview();
    await Promise.resolve();
    state.workspaceOpenPending=true;
    resolveBuild({pages:[{id:'stale'}],defs:[{pageNo:1}],totalImages:1});
    await pending;
    assert.deepEqual(state.pages,['old'],'stale preview must not replace pages during a workspace open');
    assert.deepEqual(state.pageDefs,['old defs']);
    assert.equal(elements.preview.children.length,0);
    assert.equal(elements.backEdit.style.display,'inline-block','stale preview must leave editor controls intact');
    assert.match(events.messages.at(-1).text,/Kết quả cũ đã bị bỏ/);
  }
  {
    const item={caption:'Caption before',rotate:0,key:'same',file:{id:'same'}};
    const groups=[{title:'Hồ sơ',items:[item]}];
    let resolveBuild;
    const buildPreview=()=>new Promise(resolve=>{resolveBuild=resolve;});
    const {api,elements,events,state}=setup(groups,{buildPreview,workspaceRevision:4});
    const pending=api.makePreview();
    await Promise.resolve();
    item.caption='Caption changed during render';
    resolveBuild({pages:[{id:'stale'}],defs:[{pageNo:1}],totalImages:1});
    await pending;
    assert.deepEqual(state.pages,['old'],'preview generated from a stale caption must not replace current PDF pages');
    assert.equal(elements.preview.children.length,0);
    assert.match(events.messages.at(-1).text,/Hồ sơ đã thay đổi/);
  }
  console.log('Classic Preview Skin tests passed, including stale-result rejection and workspace-open lock.');
})().catch(error=>{console.error(error);process.exitCode=1});
