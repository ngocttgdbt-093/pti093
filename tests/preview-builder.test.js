const assert=require('node:assert/strict');
global.window=global;
require('../core/preview-builder.js');
const calls=[];
const api=global.PTI093PreviewBuilder.install({
  drawPage:async(group,items,pageNo,groupPageNo,groupPages,start)=>{
    calls.push({group:group.title,items:items.map(x=>x.id),pageNo,groupPageNo,groupPages,start});
    return {rendered:pageNo};
  }
});
(async()=>{
  const groups=[
    {title:'Hiện trường',items:[{id:1},{id:2},{id:3},{id:4},{id:5}]},
    {title:'Giấy tờ',items:[{id:6},{id:7}]},
    {title:'Không có ảnh',items:[]}
  ];
  const result=await api.buildPreview(groups,2);
  assert.equal(result.pages.length,4);
  assert.equal(result.defs.length,4);
  assert.equal(result.totalImages,7);
  assert.deepEqual(result.pages.map(x=>x.rendered),[1,2,3,4]);
  assert.deepEqual(calls,[
    {group:'Hiện trường',items:[1,2],pageNo:1,groupPageNo:1,groupPages:3,start:0},
    {group:'Hiện trường',items:[3,4],pageNo:2,groupPageNo:2,groupPages:3,start:2},
    {group:'Hiện trường',items:[5],pageNo:3,groupPageNo:3,groupPages:3,start:4},
    {group:'Giấy tờ',items:[6,7],pageNo:4,groupPageNo:1,groupPages:1,start:0}
  ]);
  assert.equal(result.defs[2].groupStartIndex,4);
  console.log('Preview Builder Core tests passed (ordered pages, per-group page numbering, and page definitions).');
})().catch(error=>{console.error(error);process.exitCode=1});
