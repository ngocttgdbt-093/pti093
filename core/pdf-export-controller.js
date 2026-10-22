(function(global){
  'use strict';
  global.PTI093PdfExportController = {
    install: function(deps){
      const {state,$,splitHighQualityPdf,exportPdfFile,msg,alert,setTimeout} = deps;
      let pdfHighQualityRunning=false;
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
        }catch(e){
          const message='Xuất PDF chất lượng cao bị gián đoạn: '+(e&&e.message?e.message:String(e))+'. Hãy kiểm tra các tệp đã lưu trước khi thử lại.';
          update(100,message);alert(message);
        }finally{
          pdfHighQualityRunning=false;if(button)button.disabled=false;if(checkbox)checkbox.disabled=false;
        }
      }
      return {exportHighQualitySplit};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
