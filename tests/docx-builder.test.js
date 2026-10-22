const assert = require('node:assert/strict');
global.window = global;
require('../core/docx-builder.js');
assert.ok(global.PTI093DocxBuilder);
const api = global.PTI093DocxBuilder.install({xmlEsc: x => String(x ?? ''), formatDateDMY: x => String(x ?? '')});
const out = api.makeDocxFiles({orientation:'portrait',bks:'TEST',hoso:'HS-1',date:'2026-10-23',garage:'Garage',gdv:'GĐV',groups:[{title:'Hiện trường',items:[{caption:'Ảnh 1'}]}]},[{name:'image1.jpg',w:1200,h:800}]);
assert.ok(out.documentXml.includes('TEST'));
assert.ok(out.documentXml.includes('Ảnh 1'));
assert.ok(out.relXml.includes('image1.jpg'));
assert.ok(out.content.includes('word/document.xml'));

const canvasEvents=[];
const imageApi=global.PTI093DocxBuilder.install({
  xmlEsc:x=>String(x??''),formatDateDMY:x=>String(x??''),
  loadImage:async file=>({width:4000,height:2000,file}),
  makeCanvas:(w,h)=>{
    const ctx={translate:(...x)=>canvasEvents.push(['translate',...x]),rotate:x=>canvasEvents.push(['rotate',x]),drawImage:(...x)=>canvasEvents.push(['drawImage',...x])};
    return {width:w,height:h,getContext:()=>ctx,toDataURL:(type,quality)=>{canvasEvents.push(['toDataURL',type,quality]);return 'data:image/jpeg;base64,AQID'}};
  },
  dataUrlBytes:()=>new Uint8Array([1,2,3])
});
(async()=>{
  const image=await imageApi.imageForDocx({name:'wide.jpg'},90);
  assert.equal(image.w,900);
  assert.equal(image.h,1800);
  assert.deepEqual(Array.from(image.bytes),[1,2,3]);
  assert.deepEqual(canvasEvents.find(x=>x[0]==='translate'),['translate',450,900]);
  assert.ok(Math.abs(canvasEvents.find(x=>x[0]==='rotate')[1]-Math.PI/2)<1e-10);
  assert.deepEqual(canvasEvents.find(x=>x[0]==='drawImage').slice(1),[canvasEvents.find(x=>x[0]==='drawImage')[1],-900,-450,1800,900]);
  assert.deepEqual(canvasEvents.find(x=>x[0]==='toDataURL'),['toDataURL','image/jpeg',0.88]);
  console.log('DOCX Builder tests passed, including image scaling and rotation.');
})().catch(error=>{console.error(error);process.exitCode=1});

