const assert=require('node:assert/strict');
global.window=global;
require('../core/pdf-export-controller.js');
assert.ok(global.PTI093PdfExportController);
function setup({pages=[{}],parts=[{filename:'part-1.pdf',blob:{size:1024}},{filename:'part-2.pdf',blob:{size:2048}}],failExport=false}={}){
  const elements={};
  for(const id of ['pdfHighQualityCheck','pdfHighProgressWrap','pdfHighProgressLabel','pdfHighProgressPct','pdfHighProgressBar']){
    elements[id]={disabled:false,textContent:'',style:{display:'',width:''}};
  }
  const events={messages:[],exports:[],alerts:[]};
  const api=global.PTI093PdfExportController.install({
    state:{pages},
    $:id=>elements[id]||(elements[id]={style:{},textContent:''}),
    splitHighQualityPdf:async(name,update)=>{events.splitName=name;events.update=update;return parts;},
    exportPdfFile:async(blob,name)=>{if(failExport)throw new Error('download failed');events.exports.push({blob,name});},
    msg:(text,ok)=>events.messages.push({text,ok}),
    alert:text=>events.alerts.push(text),
    setTimeout:fn=>{fn();return 1;}
  });
  return {api,elements,events};
}
(async()=>{
  {
    const {api,elements,events}=setup();
    const button={disabled:false},progress={textContent:''};
    await api.exportHighQualitySplit('case',button,progress);
    assert.equal(events.splitName,'case');
    assert.deepEqual(events.exports.map(x=>x.name),['part-1.pdf','part-2.pdf']);
    assert.equal(button.disabled,false);
    assert.equal(elements.pdfHighQualityCheck.disabled,false);
    assert.equal(elements.pdfHighProgressWrap.style.display,'block');
    assert.equal(elements.pdfHighProgressPct.textContent,'100%');
    assert.match(progress.textContent,/Hoàn tất gửi 2 tệp PDF/);
    assert.equal(events.alerts.length,0);
  }
  {
    const {api,elements,events}=setup({failExport:true});
    const button={disabled:false};
    await api.exportHighQualitySplit('case',button,{textContent:''});
    assert.equal(button.disabled,false);
    assert.equal(elements.pdfHighQualityCheck.disabled,false);
    assert.match(events.alerts[0],/download failed/);
  }
  {
    const {api,events}=setup({pages:[]});
    await api.exportHighQualitySplit('case',null,null);
    assert.match(events.messages[0].text,/Không có trang PDF/);
    assert.equal(events.exports.length,0);
  }
  console.log('PDF Export Controller tests passed (success, failure cleanup, and empty preview guard).');
})().catch(error=>{console.error(error);process.exitCode=1});
