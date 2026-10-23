const assert=require('node:assert/strict');
global.window=global;
require('../core/pdf-export-controller.js');
assert.ok(global.PTI093PdfExportController);
function setup({pages=[{}],parts=[{filename:'part-1.pdf',blob:{size:1024}},{filename:'part-2.pdf',blob:{size:2048}}],failExport=false,pdfResult={bytes:new Uint8Array([1,2,3]),compressed:false,dpi:150,quality:0.8},failBuild=false,failFinalize=false,workspaceOpenPending=false,driveOpenIncomplete=false,onBuild=null,onSplit=null,onExport=null,onWait=null}={}){
  const elements={};
  for(const id of ['pdfHighQualityCheck','pdfHighProgressWrap','pdfHighProgressLabel','pdfHighProgressPct','pdfHighProgressBar']){
    elements[id]={disabled:false,textContent:'',style:{display:'',width:''}};
  }
  const events={messages:[],exports:[],alerts:[],warnings:[],finalized:0,finalizeLockStates:[]};
  const state={pages,workspaceOpenPending,driveOpenIncomplete,pageDefs:[{pageNo:1}],workspaceRevision:0,workspaceMutationRevision:0};
  const api=global.PTI093PdfExportController.install({
    state,
    $:id=>elements[id]||(elements[id]={style:{},textContent:''}),
    splitHighQualityPdf:async(name,update,snapshot)=>{events.splitName=name;events.update=update;events.splitSnapshot=snapshot;if(onSplit)await onSplit(state,snapshot);return parts;},
    exportPdfFile:async(blob,name)=>{if(failExport)throw failExport==='abort'?Object.assign(new Error('user cancelled'),{name:'AbortError'}):new Error('download failed');events.exports.push({blob,name});if(onExport)await onExport(state,{blob,name});},
    buildAdaptivePdf:async pages=>{events.pagesPassed=pages;if(failBuild)throw new Error('build failed');if(onBuild)await onBuild(state,pages);return pdfResult;},
    pdfPackSize:bytes=>bytes.length,
    pdfFileName:()=> 'case.pdf',
    getPdfWarningSkin:()=>({hidePdfWarning:()=>events.warnings.push('hide'),showPdfWarning:(...args)=>events.warnings.push(['show',...args])}),
    finalizeCompletedSession:async()=>{events.finalized++;events.finalizeLockStates.push(state.workspaceOpenPending);if(failFinalize)return false;return true;},
    msg:(text,ok)=>events.messages.push({text,ok}),
    alert:text=>events.alerts.push(text),
    setTimeout:(fn,delay)=>{if(onWait)onWait(state,delay,events);fn();return 1;}
  });
  return {api,elements,events,state};
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
    assert.equal(events.finalized,1,'successful high-quality export should clear the completed auto-draft');
    assert.deepEqual(events.finalizeLockStates,[true],'post-export AUTO-DRAFT cleanup must reserve the workspace against concurrent opens');
  }
  {
    const {api,events}=setup({failFinalize:true});
    const button={disabled:false};
    await api.exportHighQualitySplit('case',button,{textContent:''});
    assert.equal(events.exports.length,2,'PDF parts should remain exported even if draft cleanup fails');
    assert.equal(events.alerts.length,0,'cleanup failure must not be reported as a PDF export failure');
    assert.match(events.messages.at(-1).text,/PDF đã xuất thành công, nhưng chưa dọn được nháp tự động/);
  }
  {
    const {api,elements,events}=setup({failExport:true});
    const button={disabled:false};
    await api.exportHighQualitySplit('case',button,{textContent:''});
    assert.equal(button.disabled,false);
    assert.equal(elements.pdfHighQualityCheck.disabled,false);
    assert.match(events.alerts[0],/download failed/);
    assert.equal(events.finalized,0,'failed high-quality export must retain the auto-draft for recovery');
  }
  {
    const {api,elements,events}=setup({failExport:'abort'});
    const progress={textContent:''};
    await api.exportHighQualitySplit('case',{disabled:false},progress);
    assert.equal(events.finalized,0,'cancelling iOS share must not clear AUTO-DRAFT');
    assert.notEqual(elements.pdfHighProgressPct.textContent,'100%','cancelled share must not falsely show 100% completion');
    assert.equal(events.alerts.length,0,'user cancellation should not be reported as an export error');
    assert.match(events.messages.at(-1).text,/Đã hủy chia sẻ PDF/);
  }
  {
    const {api,events}=setup({failExport:'abort'});
    await api.exportStandardPdf({disabled:false});
    assert.equal(events.finalized,0,'cancelling standard PDF share must retain AUTO-DRAFT');
    assert.equal(events.alerts.length,0,'standard PDF cancellation should not show an error alert');
    assert.match(events.messages.at(-1).text,/Đã hủy chia sẻ PDF/);
  }
  {
    const high=setup({driveOpenIncomplete:true});
    await high.api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
    assert.equal(high.events.exports.length,2,'available PDF parts may still be exported from the partial workspace');
    assert.equal(high.events.finalized,0,'high-quality export of partial Drive workspace must retain AUTO-DRAFT');
    assert.match(high.events.messages.at(-1).text,/Bản nháp được giữ lại/);
    const standard=setup({driveOpenIncomplete:true});
    await standard.api.exportStandardPdf({disabled:false});
    assert.equal(standard.events.exports.length,1,'standard PDF may still be exported from the partial workspace');
    assert.equal(standard.events.finalized,0,'standard export of partial Drive workspace must retain AUTO-DRAFT');
    assert.match(standard.events.messages.at(-1).text,/Bản nháp được giữ lại/);
  }
  {
    const {api,events}=setup({workspaceOpenPending:true});
    await api.exportStandardPdf({disabled:false});
    await api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
    assert.equal(events.exports.length,0,'PDF export must not use stale pages while another record is opening');
    assert.equal(events.finalized,0,'blocked PDF export must not clear AUTO-DRAFT');
    assert.match(events.messages.at(-1).text,/Đang mở hồ sơ khác/);
  }
  {
    const {api,events}=setup({pages:[]});
    await api.exportHighQualitySplit('case',null,null);
    assert.match(events.messages[0].text,/Không có trang PDF/);
    assert.equal(events.exports.length,0);
  }
  {
    const {api,elements,events}=setup();
    const button={disabled:false};
    await api.exportStandardPdf(button);
    assert.equal(events.pagesPassed.length,1);
    assert.equal(events.exports[0].name,'case.pdf');
    assert.equal(events.exports[0].blob.type,'application/pdf');
    assert.deepEqual(events.warnings,['hide']);
    assert.equal(events.finalized,1);
    assert.equal(events.finalizeLockStates[0],true,'standard PDF cleanup must run under the workspace lock');
    assert.equal(elements.backEdit.style.display,'inline-block');
    assert.equal(elements.newCase.style.display,'inline-block');
    assert.match(events.messages.at(-1).text,/không cần nén ảnh/);
    assert.equal(button.disabled,false);
  }
  {
    const {api,events}=setup({failFinalize:true});
    await api.exportStandardPdf({disabled:false});
    assert.equal(events.exports.length,1,'standard PDF should remain exported when draft cleanup fails');
    assert.equal(events.alerts.length,0,'cleanup failure must not show a false export-failed alert');
    assert.match(events.messages.at(-1).text,/PDF đã xuất thành công, nhưng chưa dọn được nháp tự động/);
  }
  {
    const {api,events}=setup({pdfResult:{bytes:new Uint8Array(20),compressed:true,dpi:96,quality:0.6}});
    await api.exportStandardPdf({disabled:false});
    assert.equal(events.exports[0].name,'case.pdf');
    assert.equal(events.warnings[0][0],'show');
    assert.equal(events.warnings[0][2],'case.pdf');
    assert.equal(events.finalized,1);
    assert.match(events.messages.at(-1).text,/chế độ nén/);
  }
  {
    const {api,events}=setup({failBuild:true});
    const button={disabled:false};
    await api.exportStandardPdf(button);
    assert.equal(button.disabled,false);
    assert.match(events.alerts[0],/build failed/);
    assert.match(events.messages.at(-1).text,/Không thể xuất PDF/);
  }
  {
    const {api,elements,events}=setup();
    api.bindControls();
    assert.equal(typeof elements.pdf.onclick,'function','Controller should own standard PDF button binding');
    await elements.pdf.onclick();
    assert.equal(events.exports[0].name,'case.pdf');
    assert.equal(events.finalized,1);
  }
  {
    const high=setup({onSplit:async state=>{state.pages=[{id:'new workspace page'}];}});
    await high.api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
    assert.deepEqual(high.events.splitSnapshot.pages,[{}],'high-quality export must pass the captured pages to the splitter');
    assert.equal(high.events.exports.length,0,'high-quality export must abort before saving stale parts when workspace changes during split');
    assert.equal(high.events.finalized,0,'stale high-quality export must not clear the current AUTO-DRAFT');
    assert.match(high.events.messages.at(-1).text,/Không xóa bản nháp hiện tại/);
  }
  {
    const standard=setup({onBuild:async state=>{state.pages=[{id:'new workspace page'}];}});
    await standard.api.exportStandardPdf({disabled:false});
    assert.equal(standard.events.exports.length,0,'standard export must not save a PDF built from a stale workspace');
    assert.equal(standard.events.finalized,0,'standard export must not finalize a changed workspace');
    assert.match(standard.events.messages.at(-1).text,/Bản nháp hiện tại được giữ nguyên/);
  }
  {
    const standard=setup({pdfResult:{bytes:new Uint8Array(20),compressed:true,dpi:96,quality:0.6},onExport:async state=>{state.pages=[{id:'new workspace page'}];}});
    await standard.api.exportStandardPdf({disabled:false});
    assert.equal(standard.events.exports.length,1,'already-saved PDF cannot be recalled if workspace changes during share');
    assert.equal(standard.events.finalized,0,'workspace change during share must retain the current AUTO-DRAFT');
    assert.match(standard.events.messages.at(-1).text,/Bản nháp hiện tại được giữ nguyên/);
  }
  console.log('PDF Export Controller tests passed (snapshot-safe exports, serialized AUTO-DRAFT cleanup, warnings, and recovery).');
})().catch(error=>{console.error(error);process.exitCode=1});


(async()=>{
  const standard=setup({onBuild:async state=>{state.workspaceRevision++;}});
  await standard.api.exportStandardPdf({disabled:false});
  assert.equal(standard.events.exports.length,0,'standard PDF must abort when workspace revision changes even if page arrays remain the same');
  assert.equal(standard.events.finalized,0,'a stale standard export must not clear the new workspace draft');
  assert.match(standard.events.messages.at(-1).text,/hồ sơ đã thay đổi trong lúc xuất PDF/i);
  const high=setup({onSplit:async state=>{state.workspaceRevision++;}});
  await high.api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
  assert.equal(high.events.exports.length,0,'high-quality PDF must abort when workspace revision changes without page-array identity changes');
  assert.equal(high.events.finalized,0,'a stale high-quality export must not clear the new workspace draft');
  assert.match(high.events.messages.at(-1).text,/hồ sơ thay đổi trong lúc xuất/i);
  console.log('PDF workspace revision race regressions passed.');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
  const standard=setup({onBuild:async state=>{state.workspaceMutationRevision++;}});
  await standard.api.exportStandardPdf({disabled:false});
  assert.equal(standard.events.exports.length,0,'standard PDF must abort when content changes but page-array references remain identical');
  assert.equal(standard.events.finalized,0,'content changes during standard export must never clear AUTO-DRAFT');
  assert.match(standard.events.messages.at(-1).text,/hồ sơ đã thay đổi trong lúc xuất PDF/i);
  const high=setup({onSplit:async state=>{state.workspaceMutationRevision++;}});
  await high.api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
  assert.equal(high.events.exports.length,0,'high-quality PDF must abort when content changes but page-array references remain identical');
  assert.equal(high.events.finalized,0,'content changes during split export must never clear AUTO-DRAFT');
  assert.match(high.events.messages.at(-1).text,/hồ sơ thay đổi trong lúc xuất/i);
  console.log('PDF content-mutation revision race regressions passed.');
})().catch(error=>{console.error(error);process.exitCode=1});

(async()=>{
  const high=setup({onWait:(state,delay,events)=>{if(delay===180&&events.exports.length===2)state.workspaceMutationRevision++;}});
  await high.api.exportHighQualitySplit('case',{disabled:false},{textContent:''});
  assert.equal(high.events.exports.length,2,'already-sent PDF parts remain saved when an edit occurs during the final wait');
  assert.equal(high.events.finalized,0,'an edit during the final post-export wait must prevent AUTO-DRAFT cleanup');
  assert.match(high.events.messages.at(-1).text,/Không xóa bản nháp hiện tại/);
  console.log('PDF final-wait content mutation regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
