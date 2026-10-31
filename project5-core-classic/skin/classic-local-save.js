(function(global){
  'use strict';
  global.PTI093ClassicLocalSaveSkin = {
    install: function(deps){
      const doc=deps.document||document;
      function renderLocalSaveFeedback(id,pct,label,detail='',failed=false){
        const host=doc.getElementById('ptiPreviewFeedback');
        if(!host)return;
        host.style.display='grid';host.style.visibility='visible';
        let panel=doc.getElementById('ptiLocalSaveFeedback');
        if(!panel){
          panel=doc.createElement('div');panel.id='ptiLocalSaveFeedback';
          panel.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #b8d9c7;border-radius:10px;background:#f3fbf6;color:#174d34;font-size:13px;line-height:1.5';
          panel.innerHTML='<div id="ptiLocalSaveId" style="font-weight:800;overflow-wrap:anywhere;margin-bottom:5px"></div><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span id="ptiLocalSaveLabel" style="font-weight:700"></span><strong id="ptiLocalSavePct">0%</strong></div><div style="height:9px;border-radius:999px;background:#dcebe2;overflow:hidden;margin-top:6px"><div id="ptiLocalSaveBar" style="height:100%;width:0%;background:#07834f;transition:width .2s"></div></div><div id="ptiLocalSaveDetail" style="margin-top:5px;color:#52685b;overflow-wrap:anywhere"></div>';
          host.prepend(panel);
        }
        panel.style.borderColor=failed?'#d97777':'#b8d9c7';panel.style.background=failed?'#fff5f5':'#f3fbf6';panel.style.color=failed?'#8a2424':'#174d34';
        const idEl=doc.getElementById('ptiLocalSaveId');if(idEl)idEl.textContent='💻 ID hồ sơ local: '+(id||'Đang tạo ID…');
        const labelEl=doc.getElementById('ptiLocalSaveLabel');if(labelEl)labelEl.textContent=label;
        const pctEl=doc.getElementById('ptiLocalSavePct');if(pctEl)pctEl.textContent=typeof pct==='number'?pct+'%':'!';
        const bar=doc.getElementById('ptiLocalSaveBar');if(bar){bar.style.width=(typeof pct==='number'?Math.max(0,Math.min(100,pct)):100)+'%';bar.style.background=failed?'#c43d3d':'#07834f'}
        const detailEl=doc.getElementById('ptiLocalSaveDetail');if(detailEl)detailEl.textContent=detail;
      }
      function showLocalSaveConfirm(n){
        return new Promise(resolve=>{
          const overlay=doc.createElement('div');overlay.className='localSaveOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
          overlay.innerHTML='<div class="localSaveDialog"><div class="localSaveHead"><div class="localSaveIcon">💻</div><div class="localSaveTitle">Xác nhận lưu ảnh tại máy</div></div><div class="localSaveBody">Ảnh gốc sẽ được lưu trong bộ nhớ của <strong>trình duyệt trên máy này</strong> và <strong>không tải ảnh lên Google Drive</strong>.<br><br>Thông tin hồ sơ, chú thích và thứ tự ảnh vẫn được đồng bộ lên Drive để có thể tìm theo Mã HS/BKS. Ảnh lưu tại máy không thể mở trên máy khác.<div class="localSaveCount">📷 Số ảnh: '+n+'</div></div><div class="localSaveActions"><button type="button" class="localSaveCancel">Hủy</button><button type="button" class="localSaveConfirm">✓ Xác nhận & lưu</button></div></div>';
          const finish=v=>{overlay.remove();resolve(v)};
          overlay.querySelector('.localSaveCancel').onclick=()=>finish(false);
          overlay.querySelector('.localSaveConfirm').onclick=()=>finish(true);
          overlay.onclick=e=>{if(e.target===overlay)finish(false)};
          doc.body.appendChild(overlay);
          overlay.querySelector('.localSaveConfirm').focus();
        });
      }
      return {renderLocalSaveFeedback,showLocalSaveConfirm};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
