'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('async function splitHighQualityPdf('),b=html.indexOf('function splitPdfBytes(',a);
assert(a>=0&&b>a,'App splitter must exist');
const splitSource=html.slice(a,b);
async function testSplitter(source,isCore=false){
  for(const count of [1,2,9,10,98,240]){
    const defs=Array.from({length:count},(_,i)=>({group:i}));
    const weights=defs.map((_,i)=>395000+(i%3)*1000);
    const ctx={state:{pages:defs,pageDefs:defs},Blob,TextEncoder,Uint8Array,setTimeout,PDF_SAFE_LIMIT:9999999,pagePixels:()=>({dpi:150}),jpegQuality:()=>.8,pdfPackSize:b=>b.simulatedSize,
      drawPage:async(i,a,n,g,t,s,label)=>({width:10,height:10,toDataURL:()=>JSON.stringify({i,label})}),
      makePdfAt:pages=>{const entries=pages.map(p=>JSON.parse(p.toDataURL()));const bytes=new TextEncoder().encode(JSON.stringify(entries));bytes.simulatedSize=1000+entries.reduce((n,p)=>n+weights[p.i]+12000+p.label.length*20,0);return {bytes,dpi:150,quality:.8};},
      buildAdaptivePdf:()=>{throw Error('Unexpected compression');},window:{}};
    vm.createContext(ctx);vm.runInContext(source,ctx);
    const splitter=isCore?ctx.window.PTI093PdfExportCore.install(ctx).splitHighQualityPdf:ctx.splitHighQualityPdf;
    const parts=await splitter('test.pdf');let order=[];
    for(let p=0;p<parts.length;p++){
      const entries=JSON.parse(await parts[p].blob.text());const label=(p+1)+'/'+parts.length;
      assert(entries.every(e=>e.label===label),'All final labels must use final denominator');
      const size=1000+entries.reduce((n,e)=>n+weights[e.i]+12000+label.length*20,0);assert(size<10000000);
      order.push(...entries.map(e=>e.i));
      if(p<parts.length-1)assert(size+weights[order.length]+12000+label.length*20>=10000000,'Every nonfinal part must be maximal');
    }
    assert.deepEqual(order,defs.map((_,i)=>i),'No missing, repeated, or reordered page');
    if(count>25)for(const part of parts.slice(0,-1))assert(JSON.parse(await part.blob.text()).length>1);
  }
}
(async()=>{
  for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
  await testSplitter(splitSource);
  if(fs.existsSync('core/core/pdf-export.js'))await testSplitter(fs.readFileSync('core/core/pdf-export.js','utf8'),true);
  console.log('PASS: sequential maximal packing, label-size boundary regression, stable denominators, 1/2/9/10/98/240 pages, script syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
