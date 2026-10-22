const assert=require('node:assert/strict');
global.window=global;
require('../skin/classic-preview.js');
assert.ok(global.PTI093ClassicPreviewSkin);
function setup(groups){
  const elements={
    backEdit:{style:{display:'inline-block'}},
    newCase:{style:{display:'inline-block'}},
    preview:{innerHTML:'old preview',children:[],appendChild(node){this.children.push(node);},getBoundingClientRect:()=>({top:200})},
    previewInfo:{textContent:''},
    pdf:{disabled:true}
  };
  const events={selected:'',hidden:0,messages:[],scroll:null,buildArgs:null};
  const state={per:2,pages:['old'],pageDefs:['old defs']};
  const doc={createElement:tag=>({tag,className:'',textContent:'',children:[],append(...nodes){this.children.push(...nodes);}})};
  const win={scrollY:100,scrollTo:opts=>{events.scroll=opts;}};
  const api=global.PTI093ClassicPreviewSkin.install({
    state,$:id=>elements[id],document:doc,window:win,
    buildPreview:async(gs,per)=>{events.buildArgs={gs,per};return {pages:[{id:'page1'},{id:'page2'}],defs:[{pageNo:1},{pageNo:2}],totalImages:3};},
    getAllGroups:()=>groups,selectedGdv:()=> 'GĐV thử',
    setSelectedGdvCache:value=>{events.selected=value;},
    hidePdfWarning:()=>{events.hidden++;},msg:(text,ok)=>events.messages.push({text,ok}),
    pagePixels:()=>({dpi:150}),jpegQuality:()=>0.8
  });
  return {api,elements,events,state};
}
(async()=>{
  {
    const groups=[{title:'Hiện trường',items:[{},{ }]},{title:'Giấy tờ',items:[{}]}];
    const {api,elements,events,state}=setup(groups);
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
    assert.match(elements.previewInfo.textContent,/150 DPI / JPEG 80%/);
    assert.equal(elements.pdf.disabled,false);
    assert.equal(elements.backEdit.style.display,'none');
    assert.equal(elements.newCase.style.display,'inline-block');
    assert.equal(events.scroll.top,220);
  }
  {
    const {api,elements,events,state}=setup([]);
    await api.makePreview();
    assert.equal(state.pages[0],'old','empty preview should not overwrite existing pages');
    assert.equal(elements.preview.children.length,0);
    assert.match(events.messages[0].text,/Chưa có ảnh để Preview/);
  }
  console.log('Classic Preview Skin tests passed, including state assignment required for PDF export.');
})().catch(error=>{console.error(error);process.exitCode=1});
