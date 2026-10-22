const assert=require('node:assert/strict');
global.window=global;
require('../core/pdf-export.js');
(async function(){
  const state={pages:[],pageDefs:[]},drawCalls=[],progress=[];
  const api=global.PTI093PdfExportCore.install({
    state,PDF_SAFE_LIMIT:10,
    drawPage:async(...args)=>{drawCalls.push(args);return {pageNo:args[2],label:args[6]};},
    makePdfAt:items=>({bytes:new Uint8Array(items.length*6),dpi:150,quality:0.8}),
    pagePixels:()=>({dpi:150}),jpegQuality:()=>0.8,
    pdfPackSize:bytes=>bytes.length
  });
  assert.deepEqual(await api.splitHighQualityPdf('empty.pdf'),[],'empty preview should not produce PDF parts');
  state.pages=[{id:1},{id:2},{id:3}];
  state.pageDefs=[
    {group:'G1',pageItems:['a'],pageNo:1,groupPageNo:1,groupPages:1,groupStartIndex:0},
    {group:'G2',pageItems:['b'],pageNo:2,groupPageNo:1,groupPages:1,groupStartIndex:1},
    {group:'G3',pageItems:['c'],pageNo:3,groupPageNo:1,groupPages:1,groupStartIndex:2}
  ];
  const parts=await api.splitHighQualityPdf('report.pdf',(pct,label)=>progress.push({pct,label}));
  assert.equal(parts.length,3,'size limit should split three oversized aggregate pages into three files');
  assert.deepEqual(parts.map(p=>p.filename),['report 1.pdf','report 2.pdf','report 3.pdf']);
  assert.deepEqual(parts.map(p=>p.dpi),[150,150,150]);
  assert.deepEqual(parts.map(p=>p.quality),[0.8,0.8,0.8]);
  assert.deepEqual(drawCalls.map(c=>c[6]),['1/3','2/3','3/3'],'each PDF part should receive its correct part label');
  assert.ok(progress.length>=6,'progress should report planning and rendering');
  assert.ok(parts.every(p=>p.blob.type==='application/pdf'));
  console.log('PDF Export Core tests passed: empty state, size-based splitting, part labels, metadata, and progress.');
})().catch(e=>{console.error(e);process.exit(1)});
