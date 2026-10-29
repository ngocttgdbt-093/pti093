(function(){
 function mountGallery(){
  var wrap=document.querySelector('body:not(.classic-ui) .wrap');
  var source=document.getElementById('grid');
  if(!wrap||!source||source.dataset.pcGalleryMounted==='1') return;
  var section=document.createElement('section');
  section.className='card pcImageGallery';
  section.innerHTML='<div class="hd"><span>Danh sách ảnh đã chọn</span><span id="pcGalleryCount" style="font-size:12px;font-weight:600">Chưa có ảnh</span></div><div class="bd"></div>';
  section.querySelector('.bd').appendChild(source);
  var third=wrap.querySelector(':scope > .card:nth-of-type(3)');
  if(third&&third.nextSibling) wrap.insertBefore(section,third.nextSibling); else wrap.appendChild(section);
  source.dataset.pcGalleryMounted='1';
  var galleryBody=section.querySelector('.bd');
  var saved=document.createElement('div');saved.id='pcSavedGroupsGallery';saved.style.cssText='display:grid;gap:14px;margin-top:12px';
  galleryBody.appendChild(saved);
  function renderSavedGroupsGallery(){
   if(typeof state==='undefined')return;
   saved.innerHTML='';
   var total=0;
   (state.groups||[]).forEach(function(gr,gi){
    var items=gr.items||[]; total+=items.length;
    var card=document.createElement('div');
    card.style.cssText='border:1px solid #d8e5fb;border-radius:10px;padding:12px;background:#fff;margin-bottom:12px';
    var head=document.createElement('div');head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px';
    var title=document.createElement('strong');title.textContent=(gi+1)+'. '+(gr.title||'Nội dung')+' · '+items.length+' ảnh';
    var edit=document.createElement('button');edit.className='btn light';edit.textContent='✎ Sửa nội dung';edit.addEventListener('click',function(){if(typeof editGroup==='function')editGroup(gi);saved.style.display='none';});
    head.append(title,edit);card.appendChild(head);
    var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px';
    items.forEach(function(it,ii){
      var tile=document.createElement('div');tile.style.cssText='min-width:0;border:1px solid #e0e8f5;border-radius:8px;padding:6px;background:#f8fbff';
      var im=document.createElement('img');im.alt='Ảnh '+(ii+1);im.style.cssText='width:100%;height:88px;object-fit:contain;background:#eef3fa;border-radius:5px;display:block';
      if(it.file){var url=URL.createObjectURL(it.file);im.src=url;im.onload=function(){URL.revokeObjectURL(url)}}
      else if(it.previewUrl||it.dataUrl||it.src) im.src=it.previewUrl||it.dataUrl||it.src;
      var label=document.createElement('div');label.textContent='Ảnh '+(ii+1);label.style.cssText='font-size:12px;font-weight:700;margin:5px 0';
      var caption=document.createElement('textarea');caption.value=it.caption||'';caption.placeholder='Thuyết minh ảnh…';caption.rows=2;caption.style.cssText='width:100%;box-sizing:border-box;resize:vertical;font-size:12px;border:1px solid #d6e2f5;border-radius:6px;padding:5px';
      function normalizeCaption(preserveTrailingWhitespace){
       var tools=window.PTI093CaptionTools;
       var value=tools&&typeof tools.normalizeCaption==='function'
        ?tools.normalizeCaption(caption.value,{preserveTrailingWhitespace:!!preserveTrailingWhitespace})
        :caption.value;
       if(caption.value!==value){var before=caption.value,pos=caption.selectionStart,prefix=0;while(prefix<before.length&&prefix<value.length&&before.charAt(prefix)===value.charAt(prefix))prefix++;caption.value=value;var nextPos=pos<=prefix?pos:Math.max(prefix,Math.min(value.length,pos+value.length-before.length));try{caption.setSelectionRange(nextPos,nextPos)}catch(e){}}
       it.caption=value;
      }
      caption.addEventListener('input',function(){normalizeCaption(true);scheduleAutoDraftSave(false)});
      caption.addEventListener('change',function(){normalizeCaption(false);scheduleAutoDraftSave(false)});
      caption.addEventListener('blur',function(){normalizeCaption(false);scheduleAutoDraftSave(false)});
      var actions=document.createElement('div');actions.style.cssText='display:flex;gap:4px;margin-top:5px';
      var rotate=document.createElement('button');rotate.className='btn light';rotate.textContent='↻';rotate.title='Xoay ảnh';rotate.style.cssText='padding:4px 8px';rotate.onclick=function(){if(typeof editGroup==='function'){editGroup(gi);state.current.items[ii].rotate=((state.current.items[ii].rotate||0)+90)%360;render();saved.style.display='none';}};
      var remove=document.createElement('button');remove.className='btn light';remove.textContent='🗑';remove.title='Xóa ảnh';remove.style.cssText='padding:4px 8px';remove.onclick=function(){if(confirm('Xóa ảnh '+(ii+1)+' khỏi nội dung này?')){items.splice(ii,1);renderSavedGroupsGallery();scheduleAutoDraftSave(true)}};
      var replace=document.createElement('button');replace.className='btn light';replace.textContent='🖼';replace.title='Thay ảnh';replace.style.cssText='padding:4px 8px';replace.onclick=function(){if(typeof editGroup==='function'){editGroup(gi);state.replaceIndex=ii;$('replaceFile').click();saved.style.display='none';}};
      actions.append(rotate,replace,remove);tile.append(im,label,caption,actions);grid.appendChild(tile);
    });
    card.appendChild(grid);saved.appendChild(card);
   });
   var current=(state.current&&state.current.items)||[];total+=current.length;
   var label=section.querySelector('#pcGalleryCount');if(label)label.textContent=total?total+' ảnh':'Chưa có ảnh';
   if(!saved.children.length)saved.innerHTML='<div class="muted">Chưa có ảnh. Thêm ảnh ở khu vực chọn ảnh phía trên.</div>';
  }
  function countImages(){
   var n=source.querySelectorAll('.thumb').length;
   var label=section.querySelector('#pcGalleryCount');
   if(label&&!((typeof state!=='undefined')&&state.groups&&state.groups.length)) label.textContent=n ? n+' ảnh' : 'Chưa có ảnh';
  }
  new MutationObserver(function(){countImages()}).observe(source,{childList:true,subtree:true});
  countImages();
  window.pti093RenderSavedGroupsGallery=renderSavedGroupsGallery;
  renderSavedGroupsGallery();
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountGallery); else mountGallery();
})();
