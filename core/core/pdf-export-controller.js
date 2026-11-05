(function(global){
  'use strict';
  global.PTI093PdfExportController = {
    install: function(deps){
      const {state,$,splitHighQualityPdf,exportPdfFile,msg,alert,setTimeout,buildAdaptivePdf,pdfPackSize,pdfFileName,getPdfWarningSkin,finalizeCompletedSession} = deps;
let pdfDownloadUrls=[];
function clearPdfDownloads(){
  pdfDownloadUrls.forEach(url=>URL.revokeObjectURL(url));pdfDownloadUrls=[];
  const old=document.getElementById('pdfDownloadList');if(old)old.remove();
}
async function showPdfDownloads(parts,filenameBase,host){
  // Keep every part available until the next export or page unload. No automatic multi-downloads.
  const box=document.createElement('div');box.id='pdfDownloadList';box.style.cssText='margin-top:12px;display:grid;gap:9px';
  const note=document.createElement('div');note.textContent='Đã tạo '+parts.length+' file PDF. Bấm tải từng phần hoặc tải trọn bộ ZIP. Trình duyệt có thể chặn tải nhiều file tự động; danh sách này cho phép tải lại từng file.';box.appendChild(note);
  function link(blob,name,text){const a=document.createElement('a');a.href=URL.createObjectURL(blob);pdfDownloadUrls.push(a.href);a.download=name;a.textContent=text;a.className='btn light';a.style.cssText='display:block;overflow-wrap:anywhere';box.appendChild(a);return a;}
  clearPdfDownloads();host.appendChild(box);
  parts.forEach((part,i)=>link(part.blob,part.filename,'Tải phần '+(i+1)+'/'+parts.length+' · '+part.filename+' ('+(part.blob.size/1000000).toFixed(2)+' MB)'));
  // ZIP store: no JPEG recompression, Blob chunks avoid copying the full archive twice.
  const enc=new TextEncoder(),body=[],central=[];let offset=0;
  const word=(n,len)=>{const b=new Uint8Array(len);for(let i=0;i<len;i++)b[i]=(n>>>(8*i))&255;return b;};
  const u16=n=>word(n,2),u32=n=>word(n,4);
  for(const part of parts){
    const data=new Uint8Array(await part.blob.arrayBuffer()),name=enc.encode(part.filename);let crc=0xffffffff;
    for(const b of data){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
    const local=new Blob([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,part.blob]);body.push(local);
    central.push(new Blob([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=local.size;
  }
  const directory=new Blob(central),zip=new Blob([...body,directory,u32(0x06054b50),u16(0),u16(0),u16(parts.length),u16(parts.length),u32(directory.size),u32(offset),u16(0)],{type:'application/zip'});
  link(zip,filenameBase.replace(/\.pdf$/i,'')+'.zip','Tải trọn bộ '+parts.length+' PDF (.zip)');
}
window.addEventListener('pagehide',clearPdfDownloads);

function choosePdfExportMode(){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='localSaveOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:200000;background:rgba(23,34,29,.35);display:flex;align-items:center;justify-content:center;padding:18px';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Chọn cách xuất PDF');
    const dialog=document.createElement('div');dialog.className='localSaveDialog';dialog.style.cssText='width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #cfe1d7;border-radius:16px;box-shadow:0 18px 55px #003c2838';
    const head=document.createElement('div');head.className='localSaveHead';head.style.cssText='padding:18px 20px;background:#edf8f2;color:#006f3d;font-size:18px;font-weight:700';head.textContent='Bước 1 · PDF chất lượng cao vượt 10 MB';
    const body=document.createElement('div');body.className='localSaveBody';body.style.cssText='padding:16px 20px;color:#425149;font-size:14px;line-height:1.6';body.textContent='Chọn chia thành nhiều PDF để giữ chất lượng ảnh. Mỗi phần được ghép tuần tự sát dưới 10 MB; phần cuối chứa các trang còn lại. Hoặc bỏ qua để nén ảnh và xuất một PDF dưới 10 MB. Chưa có file nào được tải.';
    const actions=document.createElement('div');actions.className='localSaveActions';actions.style.cssText='display:flex;justify-content:flex-end;gap:9px;padding:14px 20px;flex-wrap:wrap';
    const previous=document.activeElement;
    const done=value=>{overlay.remove();document.removeEventListener('keydown',key);if(previous&&previous.focus)previous.focus();resolve(value);};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();done('cancel');}if(e.key==='Tab'){const buttons=Array.from(actions.children);if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus();}}};
    for(const [value,text] of [['cancel','Hủy'],['compress','Bỏ qua · Xuất 1 PDF nén'],['split','Đồng ý · Chia PDF chất lượng cao']]){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=value==='split'?'localSaveConfirm':'localSaveCancel';b.style.cssText='border:1px solid #cfdcd5;border-radius:9px;padding:10px 13px;cursor:pointer;font-weight:700;background:'+(value==='split'?'#00854a;color:#fff':'#fff;color:#176b4b');b.onclick=()=>done(value);actions.appendChild(b);}
    dialog.append(head,body,actions);overlay.appendChild(dialog);document.body.appendChild(overlay);document.addEventListener('keydown',key);actions.lastChild.focus();
  });
}

      let pdfHighQualityRunning=false;
      async function finalizeAfterSuccessfulExport(){
        if(state.driveOpenIncomplete){
          msg('PDF đã xuất, nhưng hồ sơ Drive đang thiếu ảnh. Bản nháp được giữ lại; hãy mở lại hồ sơ để tải đủ ảnh trước khi hoàn tất.',true);
          return;
        }
        if(state.workspaceOpenPending){
          msg('PDF đã xuất nhưng một thao tác mở hồ sơ khác đang diễn ra. Bản nháp hiện tại được giữ nguyên.',true);
          return;
        }
        // Serialize AUTO-DRAFT cleanup with local/Drive opens so a newly opened case
        // cannot race the post-export delete and lose its recovery draft.
        state.workspaceOpenPending=true;
        try{
          const cleaned=await finalizeCompletedSession();
          if(cleaned===false)throw new Error('Không dọn được nháp tự động.');
        }catch(error){
          const detail=error&&error.message?error.message:String(error);
          msg('⚠️ PDF đã xuất thành công, nhưng chưa dọn được nháp tự động: '+detail+'. Hồ sơ đã xuất vẫn được giữ lại.',true);
        }finally{
          state.workspaceOpenPending=false;
        }
      }
      function mib(n){return n/1000000}
      function assertExportSnapshot(pages,pageDefs,workspaceRevisionAtStart,workspaceMutationRevisionAtStart){
        if(state.workspaceOpenPending||(Number(state.workspaceRevision)||0)!==workspaceRevisionAtStart||(Number(state.workspaceMutationRevision)||0)!==workspaceMutationRevisionAtStart||state.pages!==pages||state.pageDefs!==pageDefs){
          const error=new Error('Hồ sơ đã thay đổi trong lúc xuất PDF. Bản nháp hiện tại được giữ nguyên; hãy tạo Preview lại rồi xuất PDF lần nữa.');
          error.code='PDF_WORKSPACE_CHANGED';
          throw error;
        }
      }
      async function exportHighQualitySplit(filenameBase,button,progress){
        if(state.workspaceOpenPending){msg('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi xuất PDF.',true);return}
        if(pdfHighQualityRunning)return;
        if(!state.pages||!state.pages.length){msg('Không có trang PDF để xuất.',true);return}
        const exportPages=state.pages,exportPageDefs=state.pageDefs,exportWorkspaceRevision=Number(state.workspaceRevision)||0,exportWorkspaceMutationRevision=Number(state.workspaceMutationRevision)||0;
        pdfHighQualityRunning=true;if(button)button.disabled=true;
        const checkbox=$('pdfHighQualityCheck');if(checkbox)checkbox.disabled=true;
        const wrap=$('pdfHighProgressWrap'),label=$('pdfHighProgressLabel'),pct=$('pdfHighProgressPct'),bar=$('pdfHighProgressBar');
        if(wrap)wrap.style.display='block';
        let lastProgress=0;
        const update=(percent,text)=>{
          const p=Math.max(0,Math.min(100,Math.round(percent)));lastProgress=p;
          if(progress)progress.textContent=text;
          if(label)label.textContent=text;
          if(pct)pct.textContent=p+'%';
          if(bar)bar.style.width=p+'%';
          msg(p+'% · '+text,true);
        };
        try{
          update(2,'Bước 2 · Đang chuẩn bị chia PDF chất lượng cao…');await new Promise(resolve=>setTimeout(resolve,40));
          const parts=await splitHighQualityPdf(filenameBase,update,{pages:exportPages,pageDefs:exportPageDefs});
          assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
          if(!parts.length)throw new Error('Không tạo được tệp PDF nào.');
          await showPdfDownloads(parts,filenameBase,wrap||progress.parentNode);
          update(100,'Đã tạo '+parts.length+' PDF. Chọn tải từng phần hoặc trọn bộ ZIP bên dưới.');
          // Download requests cannot confirm files saved; retain the recovery draft.

        }catch(e){
          if(e&&e.code==='PDF_WORKSPACE_CHANGED'){
            update(lastProgress,'Đã phát hiện hồ sơ thay đổi trong lúc xuất. Không xóa bản nháp hiện tại; hãy tạo Preview lại rồi xuất PDF lần nữa.');
          }else if(e&&e.name==='AbortError'){
            update(lastProgress,'Đã hủy chia sẻ PDF. Bản nháp vẫn được giữ để anh có thể xuất lại; kiểm tra các tệp đã lưu trước khi thử lại.');
          }else{
            const message='Xuất PDF chất lượng cao bị gián đoạn: '+(e&&e.message?e.message:String(e))+'. Hãy kiểm tra các tệp đã lưu trước khi thử lại.';
            update(100,message);alert(message);
          }
        }finally{
          pdfHighQualityRunning=false;if(button)button.disabled=false;if(checkbox)checkbox.disabled=false;
        }
      }
      async function exportStandardPdf(button){
        if(state.workspaceOpenPending){msg('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi xuất PDF.',true);return}
        if(pdfHighQualityRunning||!state.pages||!state.pages.length)return;
        const exportPages=state.pages,exportPageDefs=state.pageDefs,exportWorkspaceRevision=Number(state.workspaceRevision)||0,exportWorkspaceMutationRevision=Number(state.workspaceMutationRevision)||0;
        const btn=button||$('pdf');btn.disabled=true;
        try{
          const baseName=pdfFileName();
          msg('Bước 1 · Đang đo dung lượng PDF chất lượng cao...',true);
          let result=await buildAdaptivePdf(exportPages,{probeOnly:true});
          assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
          if(result.needsChoice){
            const mode=await choosePdfExportMode();
            assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
            if(mode==='cancel'){msg('Đã hủy xuất PDF; chưa tải file nào.',true);return;}
            if(mode==='split'){
              getPdfWarningSkin().showPdfWarning('Đã chọn chia PDF chất lượng cao. Chưa tải bản PDF nén.',baseName);
              await exportHighQualitySplit(baseName,null,$('pdfHighProgress'));
              return;
            }
            msg('Bước 2 · Đang nén ảnh để xuất 1 PDF dưới 10 MB…',true);
            result=await buildAdaptivePdf(exportPages);
          }
          assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
          const size=mib(pdfPackSize(result.bytes));
          const warnings=getPdfWarningSkin();
          if(!result.compressed){
            const blob=new Blob([result.bytes],{type:'application/pdf'});
            await exportPdfFile(blob,baseName);
            assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
            $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
            msg('Đã xuất PDF '+size.toFixed(2)+' MB · không cần nén ảnh · '+result.dpi+' DPI · JPEG '+Math.round(result.quality*100)+'%.',true);
            warnings.hidePdfWarning();
            await finalizeAfterSuccessfulExport();
          }else{
            const blob=new Blob([result.bytes],{type:'application/pdf'});
            await exportPdfFile(blob,baseName);
            assertExportSnapshot(exportPages,exportPageDefs,exportWorkspaceRevision,exportWorkspaceMutationRevision);
            $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
            msg('Đã xuất PDF '+size.toFixed(2)+' MB bằng chế độ nén. Vui lòng kiểm tra lại bản ảnh sau khi xuất.',true);
            warnings.hidePdfWarning();
            await finalizeAfterSuccessfulExport();
          }
        }catch(e){
          if(e&&e.code==='PDF_WORKSPACE_CHANGED'){
            msg('⚠️ Hồ sơ đã thay đổi trong lúc xuất PDF. Bản nháp hiện tại được giữ nguyên; hãy tạo Preview lại rồi xuất PDF lần nữa.',true);
          }else if(e&&e.name==='AbortError'){
            msg('Đã hủy chia sẻ PDF. Bản nháp vẫn được giữ để anh có thể xuất lại.',true);
          }else{
            msg('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)),false);
            alert('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)));
          }
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
