(function(global){
  'use strict';
  global.PTI093ClassicLoadProgressSkin = {
    install: function(deps){
      const $=deps.$;
      function setOpenLoad(source,index,total,detail){
        const box=$('openLoadBox'),bar=$('openLoadBar'),txt=$('openLoadText'),pct=$('openLoadPct'),meta=$('openLoadMeta');
        if(!box)return;
        box.classList.remove('hidden');
        const safeTotal=Math.max(0,Number(total)||0),safeIndex=Math.max(0,Number(index)||0);
        const p=safeTotal?Math.min(100,Math.round(safeIndex*100/safeTotal)):0;
        bar.style.width=p+'%';pct.textContent=p+'%';
        txt.textContent=detail||('Đang tải dữ liệu từ '+source+'...');
        meta.textContent=safeTotal?'Đã tải '+safeIndex+'/'+safeTotal+' ảnh · '+source:'Đang kết nối '+source+'...';
      }
      function finishOpenLoad(source,total){
        const box=$('openLoadBox'),bar=$('openLoadBar'),txt=$('openLoadText'),pct=$('openLoadPct'),meta=$('openLoadMeta');
        if(!box)return;
        box.classList.remove('hidden');bar.style.width='100%';pct.textContent='100%';
        txt.textContent='✓ Đã tải hoàn tất từ '+source;
        meta.textContent='Hoàn tất '+(Number(total)||0)+' ảnh · Có thể tiếp tục chỉnh sửa.';
      }
      return {setOpenLoad,finishOpenLoad};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
