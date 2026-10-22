(function(global){
  'use strict';
  global.PTI093ClassicPdfWarningSkin = {
    install: function(deps){
      const {$,document:doc= document,exportHighQualitySplit}=deps;
      function hidePdfWarning(){
        const box=$('pdfWarn');if(box){box.classList.add('hidden');box.innerHTML='';}
      }
      function showPdfWarning(message,baseName){
        const box=$('pdfWarn');if(!box)return;
        box.classList.remove('hidden');
        box.innerHTML='<strong>⚠️ PDF phải nén ảnh để giữ dung lượng dưới 10 MB.</strong><div style="margin-top:5px">'+message+'</div><div style="margin-top:7px">Sau khi xuất, nên mở lại file PDF và kiểm tra độ rõ của ảnh, đặc biệt ảnh số khung, tem đăng kiểm và chi tiết thiệt hại.</div>';
        const label=doc.createElement('label');
        const cb=doc.createElement('input');cb.type='checkbox';cb.id='pdfHighQualityCheck';
        const span=doc.createElement('span');span.textContent='Tách PDF thành nhiều file để giữ chất lượng ảnh cao hơn (tự động xuất khi tick).';
        label.append(cb,span);box.appendChild(label);
        const progressWrap=doc.createElement('div');progressWrap.id='pdfHighProgressWrap';progressWrap.style.cssText='display:none;margin:10px 0;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff';
        const progressTop=doc.createElement('div');progressTop.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700;margin-bottom:6px';
        const progressLabel=doc.createElement('span');progressLabel.id='pdfHighProgressLabel';progressLabel.textContent='Đang chuẩn bị…';
        const progressPct=doc.createElement('span');progressPct.id='pdfHighProgressPct';progressPct.textContent='0%';
        progressTop.append(progressLabel,progressPct);
        const progressTrack=doc.createElement('div');progressTrack.style.cssText='height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden';
        const progressBar=doc.createElement('div');progressBar.id='pdfHighProgressBar';progressBar.style.cssText='height:100%;width:0%;background:#07834f;border-radius:999px;transition:width .18s ease';
        progressTrack.appendChild(progressBar);
        const progress=doc.createElement('div');progress.id='pdfHighProgress';progress.className='status';progress.style.cssText='margin-top:7px;font-size:13px';progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
        progressWrap.append(progressTop,progressTrack,progress);box.appendChild(progressWrap);
        const button=doc.createElement('button');button.type='button';button.className='btn green pdfHighBtn';button.textContent='📄 Xuất PDF chất lượng cao · tự tách file';
        button.onclick=()=>exportHighQualitySplit(baseName,button,progress);
        box.appendChild(button);
        cb.addEventListener('change',()=>{if(cb.checked)exportHighQualitySplit(baseName,button,progress)});
      }
      return {hidePdfWarning,showPdfWarning};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
