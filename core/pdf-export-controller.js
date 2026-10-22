(function(global){
  'use strict';
  global.PTI093PdfExportController = {
    install: function(deps){
      const {state,$,splitHighQualityPdf,exportPdfFile,msg,alert,setTimeout,buildAdaptivePdf,pdfPackSize,pdfFileName,getPdfWarningSkin,finalizeCompletedSession} = deps;
      let pdfHighQualityRunning=false;
      async function finalizeAfterSuccessfulExport(){
        try{
          const cleaned=await finalizeCompletedSession();
          if(cleaned===false)throw new Error('Không dọn được nháp tự động.');
        }catch(error){
          const detail=error&&error.message?error.message:String(error);
          msg('⚠️ PDF đã xuất thành công, nhưng chưa dọn được nháp tự động: '+detail+'. Hồ sơ đã xuất vẫn được giữ lại.',true);
        }
      }
      function mib(n){return n/1048576}
      async function exportHighQualitySplit(filenameBase,button,progress){
        if(pdfHighQualityRunning)return;
        if(!state.pages||!state.pages.length){msg('Không có trang PDF để xuất.',true);return}
        pdfHighQualityRunning=true;if(button)button.disabled=true;
        const checkbox=$('pdfHighQualityCheck');if(checkbox)checkbox.disabled=true;
        const wrap=$('pdfHighProgressWrap'),label=$('pdfHighProgressLabel'),pct=$('pdfHighProgressPct'),bar=$('pdfHighProgressBar');
        if(wrap)wrap.style.display='block';
        const update=(percent,text)=>{
          const p=Math.max(0,Math.min(100,Math.round(percent)));
          if(progress)progress.textContent=text;
          if(label)label.textContent=text;
          if(pct)pct.textContent=p+'%';
          if(bar)bar.style.width=p+'%';
          msg(p+'% · '+text,true);
        };
        try{
          update(2,'Đang chuẩn bị xuất PDF chất lượng cao…');await new Promise(resolve=>setTimeout(resolve,40));
          const parts=await splitHighQualityPdf(filenameBase,update);
          if(!parts.length)throw new Error('Không tạo được tệp PDF nào.');
          for(let i=0;i<parts.length;i++){
            update(80+Math.round(i/parts.length*19),'Đang xuất tệp '+(i+1)+'/'+parts.length+' · '+parts[i].filename+' ('+mib(parts[i].blob.size).toFixed(2)+' MB)…');
            await new Promise(resolve=>setTimeout(resolve,80));await exportPdfFile(parts[i].blob,parts[i].filename);
            update(80+Math.round((i+1)/parts.length*19),'Đã gửi '+(i+1)+'/'+parts.length+' tệp PDF để lưu.');
            await new Promise(resolve=>setTimeout(resolve,180));
          }
          update(100,'Hoàn tất gửi '+parts.length+' tệp PDF. Kiểm tra thư mục Tải xuống hoặc hộp thoại Chia sẻ.');
          await finalizeAfterSuccessfulExport();
        }catch(e){
          const message='Xuất PDF chất lượng cao bị gián đoạn: '+(e&&e.message?e.message:String(e))+'. Hãy kiểm tra các tệp đã lưu trước khi thử lại.';
          update(100,message);alert(message);
        }finally{
          pdfHighQualityRunning=false;if(button)button.disabled=false;if(checkbox)checkbox.disabled=false;
        }
      }
      async function exportStandardPdf(button){
        if(!state.pages||!state.pages.length)return;
        const btn=button||$('pdf');btn.disabled=true;
        try{
          const baseName=pdfFileName();
          msg('Đang kiểm tra dung lượng PDF...',true);
          const result=await buildAdaptivePdf(state.pages);
          const size=mib(pdfPackSize(result.bytes));
          const warnings=getPdfWarningSkin();
          if(!result.compressed){
            const blob=new Blob([result.bytes],{type:'application/pdf'});
            await exportPdfFile(blob,baseName);
            $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
            msg('Đã xuất PDF '+size.toFixed(2)+' MB · không cần nén ảnh · '+result.dpi+' DPI · JPEG '+Math.round(result.quality*100)+'%.',true);
            warnings.hidePdfWarning();
            await finalizeAfterSuccessfulExport();
          }else{
            const blob=new Blob([result.bytes],{type:'application/pdf'});
            await exportPdfFile(blob,baseName);
            $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
            msg('Đã xuất PDF '+size.toFixed(2)+' MB bằng chế độ nén. Vui lòng kiểm tra lại bản ảnh sau khi xuất.',true);
            warnings.showPdfWarning('Dung lượng bản PDF ở chất lượng cao không phù hợp giới hạn 10 MB nên phần mềm đã nén ảnh. Bạn có thể xuất lại ở chất lượng cao; phần mềm sẽ tự tách thành nhiều file.',baseName);
            await finalizeAfterSuccessfulExport();
          }
        }catch(e){
          msg('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)),false);
          alert('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)));
        }finally{btn.disabled=false}
      }
      function bindControls(){
        const button=$('pdf');
        if(button)button.onclick=()=>exportStandardPdf(button);
      }
      return {exportHighQualitySplit,exportStandardPdf,bindControls};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
