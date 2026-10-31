(function(global){
  'use strict';
  global.PTI093ClassicImageGridSkin = {
    install: function(deps){
      const {state,$,imageReorder,openImageViewer,renderGroups,onReplace,onRotate,onInsert,onDelete,onCaptionChange,scheduleAutoDraftSave,msg}=deps;
      const doc=deps.document||document,urlApi=deps.URL||URL;
      const captionTools=global.PTI093CaptionTools;
      const selected=new Set();
      let lastIndex=-1,selectionMode=false,suppressClick=false,lasso=null,lassoMoved=false;
      const idOf=item=>imageReorder.ensureDragId(item);
      const getThumbs=()=>[...$('grid').querySelectorAll('.thumb[data-drag-id]')];
      const getSelectedItems=()=>state.current.items.filter(item=>selected.has(idOf(item)));
      function ensureSelectionUi(){
        const grid=$('grid');if(!grid||$('p5SelectionToolbar'))return;
        grid.dataset.selectionMode=String(selectionMode);if(!grid.dataset.p5LassoBound){grid.dataset.p5LassoBound='1';grid.addEventListener('pointerdown',startLasso);grid.addEventListener('pointermove',moveLasso);grid.addEventListener('pointerup',endLasso);grid.addEventListener('pointercancel',endLasso);}
        const toolbar=doc.createElement('div');toolbar.id='p5SelectionToolbar';toolbar.className='p5-selection-toolbar';
        const mode=doc.createElement('button');mode.type='button';mode.id='p5SelectionMode';mode.textContent='☑ Chọn nhiều';mode.setAttribute('aria-pressed','false');
        const bulk=doc.createElement('button');bulk.type='button';bulk.textContent='✎ Thuyết minh nhóm';bulk.id='p5BulkCaption';
        const clearSel=doc.createElement('button');clearSel.type='button';clearSel.textContent='Bỏ chọn';clearSel.id='p5ClearSelection';
        const help=doc.createElement('span');help.id='p5SelectionHelp';help.textContent='Ctrl/Cmd-click: chọn nhiều · Shift-click: chọn dải · bật Chọn nhiều để chạm trên mobile hoặc khoanh vùng bằng chuột.';
        toolbar.append(mode,bulk,clearSel,help);grid.parentNode.insertBefore(toolbar,grid);
        const dialog=doc.createElement('div');dialog.id='p5CaptionDialog';dialog.className='p5-caption-backdrop';dialog.hidden=true;dialog.innerHTML='<section class="p5-caption-dialog" role="dialog" aria-modal="true" aria-labelledby="p5CaptionTitle"><h3 id="p5CaptionTitle">Thuyết minh nhóm ảnh</h3><p id="p5CaptionCount"></p><label for="p5CaptionInput">Nội dung áp dụng cho các ảnh đã chọn</label><textarea id="p5CaptionInput" rows="4" placeholder="Nhập thuyết minh chung…"></textarea><p class="p5-caption-preview"><strong>Xem trước:</strong> <span id="p5CaptionPreview">(Chưa có nội dung)</span></p><div class="p5-caption-actions"><button type="button" id="p5CaptionCancel">Hủy</button><button type="button" id="p5CaptionApply">Áp dụng</button></div></section>';
        doc.body.appendChild(dialog);
        mode.addEventListener('click',()=>{selectionMode=!selectionMode;grid.dataset.selectionMode=String(selectionMode);mode.setAttribute('aria-pressed',String(selectionMode));mode.classList.toggle('active',selectionMode);mode.textContent=selectionMode?'☑ Đang chọn nhiều':'☑ Chọn nhiều';getThumbs().forEach(thumb=>{thumb.draggable=!selectionMode;thumb.title=selectionMode?'Chạm/click để chọn; kéo chuột để khoanh vùng':'Kéo ảnh để đổi thứ tự';});help.textContent=selectionMode?'Chạm/click ảnh để bật tắt chọn; kéo chuột trên ảnh để khoanh vùng.':'Ctrl/Cmd-click: chọn nhiều · Shift-click: chọn dải · bật Chọn nhiều để chạm trên mobile hoặc khoanh vùng bằng chuột.';});
        clearSel.addEventListener('click',()=>{selected.clear();lastIndex=-1;updateSelectionUi();});
        bulk.addEventListener('click',openCaptionDialog);
        const input=$('p5CaptionInput');
        input.addEventListener('input',()=>{$('p5CaptionPreview').textContent=captionTools?captionTools.normalizeCaption(input.value)||'(Chưa có nội dung)':input.value.trim()||'(Chưa có nội dung)';});
        $('p5CaptionCancel').addEventListener('click',closeCaptionDialog);
        dialog.addEventListener('click',e=>{if(e.target===dialog)closeCaptionDialog();});
        $('p5CaptionApply').addEventListener('click',applyBulkCaption);
        doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden)closeCaptionDialog();});
      }
      function ensureContextMenu(){
        let menu=$('p5ContextMenu');if(menu)return menu;
        menu=doc.createElement('div');menu.id='p5ContextMenu';menu.className='p5-context-menu';menu.hidden=true;
        menu.innerHTML='<button type="button" data-action="caption">✎ Thuyết minh nhóm</button><button type="button" data-action="delete">🗑 Xóa ảnh đã chọn</button>';
        doc.body.appendChild(menu);
        menu.querySelector('[data-action="caption"]').addEventListener('click',()=>{menu.hidden=true;openCaptionDialog();});
        menu.querySelector('[data-action="delete"]').addEventListener('click',()=>{menu.hidden=true;confirmBulkDelete();});
        doc.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.hidden=true;});
        return menu;
      }
      function openContextMenu(event,index){
        if(event.target.closest('textarea,input,button,select'))return;
        event.preventDefault();
        const item=state.current.items[index];if(!item)return;
        const id=idOf(item);
        if(!selected.has(id)){selected.clear();selected.add(id);lastIndex=index;updateSelectionUi();}
        const menu=ensureContextMenu();menu.hidden=false;
        const width=menu.offsetWidth||210,height=menu.offsetHeight||88;
        menu.style.left=Math.max(8,Math.min(event.clientX,window.innerWidth-width-8))+'px';
        menu.style.top=Math.max(8,Math.min(event.clientY,window.innerHeight-height-8))+'px';
      }
      function confirmBulkDelete(){
        const snapshot=new Set(selected);
        const targets=state.current.items.filter(item=>snapshot.has(idOf(item)));
        if(!targets.length)return;
        const backdrop=doc.createElement('div');backdrop.className='p5-delete-backdrop';
        backdrop.innerHTML='<section class="p5-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="p5DeleteTitle"><h3 id="p5DeleteTitle">Xác nhận xóa ảnh</h3><p>Bạn có chắc chắn muốn xóa các ảnh đã chọn?</p><strong>'+targets.length+' ảnh được chọn</strong><div class="p5-delete-actions"><button type="button" data-action="cancel">Hủy</button><button type="button" data-action="confirm">Xóa ảnh</button></div></section>';
        doc.body.appendChild(backdrop);
        const finish=()=>{backdrop.remove();doc.removeEventListener('keydown',onKey);};
        const onKey=event=>{if(event.key==='Escape')finish();};
        backdrop.querySelector('[data-action="cancel"]').addEventListener('click',finish);
        backdrop.addEventListener('click',event=>{if(event.target===backdrop)finish();});
        doc.addEventListener('keydown',onKey);
        backdrop.querySelector('[data-action="confirm"]').addEventListener('click',()=>{
          const before=state.current.items.length;
          state.current.items=state.current.items.filter(item=>!snapshot.has(idOf(item)));
          const removed=before-state.current.items.length;
          finish();
          if(!removed)return;
          selected.clear();lastIndex=-1;render();scheduleAutoDraftSave(true);
          msg('Đã xóa '+removed+' ảnh khỏi nội dung hiện tại.',true);
        });
      }
      function updateSelectionUi(){
        const grid=$('grid');if(!grid)return;
        getThumbs().forEach(thumb=>{const yes=selected.has(thumb.dataset.dragId);thumb.classList.toggle('p5-selected',yes);thumb.setAttribute('aria-selected',String(yes));});
        const count=selected.size;const bulk=$('p5BulkCaption');if(bulk)bulk.disabled=count===0;
        const clear=$('p5ClearSelection');if(clear)clear.disabled=count===0;
        const help=$('p5SelectionHelp');if(help&&count)help.textContent=count+' ảnh đang chọn.';
      }
      function setItemSelected(item,yes){const id=idOf(item);if(yes)selected.add(id);else selected.delete(id);}
      function selectByIndex(index,event){
        if(index<0||index>=state.current.items.length)return;
        const item=state.current.items[index],multi=selectionMode||event.ctrlKey||event.metaKey;
        if(event.shiftKey&&lastIndex>=0){
          const start=Math.min(lastIndex,index),end=Math.max(lastIndex,index);
          if(!event.ctrlKey&&!event.metaKey)selected.clear();
          for(let i=start;i<=end;i++)setItemSelected(state.current.items[i],true);
        }else if(multi){
          setItemSelected(item,!selected.has(idOf(item)));lastIndex=index;
        }else{
          selected.clear();setItemSelected(item,true);lastIndex=index;
        }
        updateSelectionUi();
      }
      function openCaptionDialog(){
        const items=getSelectedItems();if(!items.length){msg('Hãy chọn ít nhất một ảnh trước khi nhập thuyết minh nhóm.',true);return;}
        $('p5CaptionCount').textContent='Sẽ áp dụng cho '+items.length+' ảnh đã chọn.';
        $('p5CaptionInput').value='';$('p5CaptionPreview').textContent='(Chưa có nội dung)';
        $('p5CaptionDialog').hidden=false;$('p5CaptionInput').focus();
      }
      function closeCaptionDialog(){$('p5CaptionDialog').hidden=true;}
      function applyBulkCaption(){
        if(state.workspaceOpenPending){msg('Đang mở hồ sơ khác. Hãy chờ hoàn tất trước khi sửa thuyết minh.',true);return;}
        const items=getSelectedItems(),value=$('p5CaptionInput').value;
        if(!items.length){closeCaptionDialog();msg('Danh sách chọn đã thay đổi. Hãy chọn lại ảnh.',true);return;}
        if(!captionTools){msg('Không tải được module chuẩn hóa thuyết minh; chưa áp dụng dữ liệu.',true);return;}
        const result=captionTools.applyCaptionToItems(state.current.items,new Set(selected),value,{getId:idOf});
        if(!result.ok){msg(result.reason==='empty-caption'?'Nội dung thuyết minh đang trống.':'Danh sách ảnh không còn hợp lệ; chưa có ảnh nào bị thay đổi.',true);return;}
        // Chỉ bỏ chọn sau khi toàn bộ ảnh được cập nhật thành công.
        selected.clear();lastIndex=-1;
        scheduleAutoDraftSave(true);
        closeCaptionDialog();render();updateSelectionUi();msg('Đã áp dụng thuyết minh cho '+result.applied+' ảnh. Đã bỏ chọn nhóm ảnh.',true);
      }
      function startLasso(e){
        if(!selectionMode||e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,textarea,input,select'))return;
        const thumb=e.target.closest('.thumb');if(!thumb)return;
        const grid=$('grid'),r=grid.getBoundingClientRect();lasso={x:e.clientX,y:e.clientY,baseX:e.clientX,baseY:e.clientY,ctrl:e.ctrlKey||e.metaKey,grid,rect:r};
        lassoMoved=false;
        const box=doc.createElement('div');box.className='p5-lasso-box';box.id='p5LassoBox';grid.appendChild(box);
        try{grid.setPointerCapture(e.pointerId)}catch(_){}
      }
      function moveLasso(e){
        if(!lasso||e.pointerType!=='mouse')return;
        if(Math.hypot(e.clientX-lasso.baseX,e.clientY-lasso.baseY)>5)lassoMoved=true;
        if(!lassoMoved)return;
        const x1=Math.min(lasso.baseX,e.clientX),y1=Math.min(lasso.baseY,e.clientY),x2=Math.max(lasso.baseX,e.clientX),y2=Math.max(lasso.baseY,e.clientY);
        const box=$('p5LassoBox');if(box){box.style.left=(x1-lasso.rect.left+lasso.grid.scrollLeft)+'px';box.style.top=(y1-lasso.rect.top+lasso.grid.scrollTop)+'px';box.style.width=(x2-x1)+'px';box.style.height=(y2-y1)+'px';}
        if(!lasso.ctrl)selected.clear();
        getThumbs().forEach(thumb=>{const r=thumb.getBoundingClientRect(),hit=r.left<x2&&r.right>x1&&r.top<y2&&r.bottom>y1;if(hit)selected.add(thumb.dataset.dragId);});
        updateSelectionUi();
      }
      function endLasso(e){
        if(!lasso)return;
        const moved=lassoMoved,box=$('p5LassoBox');if(box)box.remove();lasso=null;lassoMoved=false;
        if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);e.preventDefault();updateSelectionUi();}
      }
      function render(){
        ensureSelectionUi();
        const grid=$('grid');grid.style.setProperty('--p5-row-gap',(state.rowGap||18)+'px');grid.style.setProperty('--p5-column-gap',(state.columnGap||18)+'px');grid.innerHTML='';
        state.current.items.forEach((item,index)=>{
          item.rotate=((item.rotate||0)%360+360)%360;
          const thumb=doc.createElement('div');thumb.className='thumb';
          thumb.addEventListener('contextmenu',event=>openContextMenu(event,index));
          thumb.dataset.dragId=idOf(item);thumb.title=selectionMode?'Chạm/click để chọn; kéo chuột để khoanh vùng':'Kéo ảnh để đổi thứ tự';thumb.draggable=!selectionMode;
          imageReorder.bindThumb(thumb,grid);
          const imageBox=doc.createElement('div');imageBox.className='imgBox';imageBox.tabIndex=0;imageBox.setAttribute('role','button');imageBox.setAttribute('aria-label','Chọn ảnh '+(index+1));
          const image=doc.createElement('img'),imageUrl=urlApi.createObjectURL(item.file);image.src=imageUrl;
          image.style.transform=`rotate(${item.rotate}deg)`;const releaseImageUrl=()=>{try{urlApi.revokeObjectURL(imageUrl)}catch(e){}};image.onload=releaseImageUrl;image.onerror=releaseImageUrl;imageBox.appendChild(image);
          const number=doc.createElement('span');number.className='n';number.textContent=index+1;
          const actions=doc.createElement('div');actions.className='thumbActions';
          const replace=doc.createElement('button');replace.className='replace';replace.textContent='🖼 Thay';replace.title='Thay ảnh, giữ nguyên vị trí';replace.onclick=()=>onReplace(index);
          const rotate=doc.createElement('button');rotate.className='rotate';rotate.textContent='↻ Xoay';rotate.title='Xoay ảnh 90°';rotate.onclick=()=>onRotate(item,index);
          const insert=doc.createElement('button');insert.className='insert';insert.textContent='＋ Thêm';insert.title='Chèn ảnh mới ngay sau ảnh này';insert.onclick=()=>onInsert(index);
          const view=doc.createElement('button');view.className='view';view.textContent='👁️ Xem';view.title='Xem ảnh kích thước lớn';view.onclick=()=>openImageViewer(item,index);
          const remove=doc.createElement('button');remove.className='del2';remove.textContent='🗑️ Xóa';remove.title='Xóa ảnh';remove.onclick=()=>onDelete(index);
          actions.append(replace,rotate,insert,view,remove);
          const caption=doc.createElement('textarea');caption.placeholder='Thuyết minh ảnh (tùy chọn)…';caption.value=item.caption;
          // Silent AutoCorrect applies to every individual caption, not only the bulk-caption dialog.
          // Preserve a trailing space while typing so users can continue entering the next word.
          caption.addEventListener('input',()=>{
            if(!captionTools){onCaptionChange(item,caption.value);return;}
            const start=caption.selectionStart,end=caption.selectionEnd;
            const normalized=captionTools.normalizeCaption(caption.value,{preserveTrailingWhitespace:true});
            if(normalized!==caption.value){
              const nextStart=captionTools.normalizeCaption(caption.value.slice(0,start),{preserveTrailingWhitespace:true}).length;
              const nextEnd=captionTools.normalizeCaption(caption.value.slice(0,end),{preserveTrailingWhitespace:true}).length;
              caption.value=normalized;
              try{caption.setSelectionRange(nextStart,nextEnd)}catch(_){}
            }
            onCaptionChange(item,caption.value);
          });
          caption.addEventListener('blur',()=>{
            if(!captionTools)return;
            const normalized=captionTools.normalizeCaption(caption.value);
            if(normalized!==caption.value){caption.value=normalized;onCaptionChange(item,normalized);}
          });
          caption.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const captions=[...grid.querySelectorAll('.thumb textarea')],currentIndex=captions.indexOf(caption),nextIndex=currentIndex+(event.shiftKey?-1:1);if(nextIndex>=0&&nextIndex<captions.length){event.preventDefault();captions[nextIndex].focus();}});
          imageBox.addEventListener('click',event=>{if(suppressClick)return;if(event.button!==0)return;event.preventDefault();selectByIndex(index,event);});
          imageBox.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectByIndex(index,event);}});
          thumb.append(imageBox,number,actions,caption);grid.appendChild(thumb);
        });
        const validIds=new Set(state.current.items.map(idOf));[...selected].forEach(id=>{if(!validIds.has(id))selected.delete(id);});
        const hasItems=state.current.items.length>0;
        $('clear').disabled=!hasItems;$('saveNext').disabled=!hasItems;$('finish').disabled=!hasItems&&!state.groups.length;
        renderGroups();updateSelectionUi();
      }
      return {render};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
