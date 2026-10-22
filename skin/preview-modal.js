(function(){
 let modal,content,origParent=null,origNext=null,opened=false,pending=false,obs=null,bodyObs=null,actionBar=null,moved=[];
 function ensure(){
  if(modal)return;
  modal=document.createElement('div');modal.id='ptiPreviewModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Xem trước bản ảnh toàn màn hình');
  modal.innerHTML='<div class="ppm-head"><div class="ppm-title">Xem trước bản ảnh · PDF A4</div><button type="button" class="ppm-close" id="ptiPreviewClose">✕ Đóng Preview</button></div><div class="ppm-content" id="ptiPreviewContent"></div><div class="ppm-foot"><div class="ppm-actions" id="ptiPreviewActions"></div><div id="ptiPreviewFeedback" style="display:grid;grid-template-columns:minmax(0,1fr);gap:7px;width:min(900px,96%);margin:8px auto 0;text-align:left"></div></div>';
  document.body.appendChild(modal);content=modal.querySelector('#ptiPreviewContent');actionBar=modal.querySelector('#ptiPreviewActions');
  modal.querySelector('#ptiPreviewClose').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close()});
 }
 function moveToFooter(el){if(!el||actionBar.contains(el))return;moved.push({el,parent:el.parentNode,next:el.nextSibling});actionBar.appendChild(el)}
 function tryOpen(){
  if(!pending||opened)return;
  const info=document.getElementById('previewInfo'),preview=document.getElementById('preview'),card=preview&&preview.closest('.wrap > .card');
  if(!card||!info||!preview||!preview.children.length||!/^Preview\s+\d+/i.test((info.textContent||'').trim()))return;
  ensure();const wrap=document.querySelector('.wrap');if(wrap)wrap.classList.remove('preview-closed');origParent=card.parentNode;origNext=card.nextSibling;card.style.display='';card.style.removeProperty('display');delete card.dataset.previewHiddenAfterClose;content.appendChild(card);
  // Exactly three footer actions, matching the Drive action row in the reference.
  moveToFooter(document.getElementById('driveCreate'));
  moveToFooter(document.getElementById('driveSaveProject'));
  moveToFooter(document.getElementById('driveSaveDraft'));
  // Khi Preview toàn màn hình, trạng thái lưu vốn nằm dưới trang sẽ bị lớp modal che khuất.
  // Đưa ID, trạng thái và thanh tiến trình vào vùng hiển thị của chính modal.
  const feedback=document.getElementById('ptiPreviewFeedback');
  ['driveState','driveId','driveProgress'].forEach(id=>{const el=document.getElementById(id);if(el&&feedback&&!feedback.contains(el)){moved.push({el,parent:el.parentNode,next:el.nextSibling});feedback.appendChild(el);el.style.width='100%';el.style.boxSizing='border-box';}});
  modal.classList.add('open');document.body.style.overflow='hidden';opened=true;pending=false;
  if(obs){obs.disconnect();obs=null}if(bodyObs){bodyObs.disconnect();bodyObs=null}
  modal.querySelector('#ptiPreviewClose').focus();
 }
 function close(){
  if(!opened)return;
  const card=content.querySelector('#preview')?.closest('.card')||content.querySelector('.card');
  const wrap=document.querySelector('.wrap');
  if(card&&origParent){
    if(origNext&&origNext.parentNode===origParent)origParent.insertBefore(card,origNext);else origParent.appendChild(card);
    card.style.removeProperty('display');
    delete card.dataset.previewHiddenAfterClose;
  }
  if(wrap)wrap.classList.add('preview-closed');
  moved.forEach(({el,parent,next})=>{if(parent){if(next&&next.parentNode===parent)parent.insertBefore(el,next);else parent.appendChild(el)}});moved=[];
  // Sau khi đóng Preview, đưa người dùng trở lại lưới ảnh chỉnh sửa của nhóm cuối cùng
  // thay vì để họ ở màn hình tóm tắt chỉ có các nút sửa/thay/xóa.
  if(typeof state!=='undefined'&&state.groups&&state.groups.length&&typeof editGroup==='function'){
    const lastGroupIndex=state.groups.length-1;
    editGroup(lastGroupIndex);
    const savedGallery=document.getElementById('pcSavedGroupsGallery');
    if(savedGallery)savedGallery.style.display='none';
  }else{
    if(typeof window.pti093RenderSavedGroupsGallery==='function')window.pti093RenderSavedGroupsGallery();
  }
  modal.classList.remove('open');document.body.style.overflow='';opened=false;pending=false;origParent=null;origNext=null;
 }
 // Expose a controlled close action so the in-preview "Quay lại chỉnh sửa" button can close the overlay.
 window.pti093ClosePreview=close;
 document.addEventListener('click',function(e){
  if(!(e.target.closest&&e.target.closest('#finish')))return;
  pending=true;if(obs)obs.disconnect();
  const info=document.getElementById('previewInfo'),preview=document.getElementById('preview');
  if(info){obs=new MutationObserver(tryOpen);obs.observe(info,{childList:true,subtree:true,characterData:true})}
  if(preview){const po=new MutationObserver(tryOpen);po.observe(preview,{childList:true,subtree:true});const old=obs;obs={disconnect(){old&&old.disconnect();po.disconnect()}}}
  if(bodyObs)bodyObs.disconnect();bodyObs=new MutationObserver(tryOpen);bodyObs.observe(document.body,{childList:true,subtree:true});
  [100,350,800,1500,2500,4000].forEach(ms=>setTimeout(tryOpen,ms));
 },true);
})();
