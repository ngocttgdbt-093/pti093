(function(global){
  'use strict';
  global.PTI093ClassicImageGridSkin = {
    install: function(deps){
      const {state,$,imageReorder,openImageViewer,renderGroups,onReplace,onRotate,onInsert,onDelete,onCaptionChange,scheduleAutoDraftSave,msg}=deps;
      const doc=deps.document||document,urlApi=deps.URL||URL;
      function render(){
        const grid=$('grid');grid.innerHTML='';
        state.current.items.forEach((item,index)=>{
          item.rotate=((item.rotate||0)%360+360)%360;
          const thumb=doc.createElement('div');thumb.className='thumb';
          thumb.dataset.dragId=imageReorder.ensureDragId(item);thumb.title='Kéo ảnh để đổi thứ tự';thumb.draggable=true;
          imageReorder.bindThumb(thumb,grid);
          const imageBox=doc.createElement('div');imageBox.className='imgBox';
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
          caption.oninput=()=>onCaptionChange(item,caption.value);
          caption.addEventListener('keydown',event=>{
            if(event.key!=='Tab')return;
            const captions=[...grid.querySelectorAll('.thumb textarea')],currentIndex=captions.indexOf(caption),nextIndex=currentIndex+(event.shiftKey?-1:1);
            if(nextIndex>=0&&nextIndex<captions.length){event.preventDefault();captions[nextIndex].focus();}
          });
          thumb.append(imageBox,number,actions,caption);grid.appendChild(thumb);
        });
        const hasItems=state.current.items.length>0;
        $('clear').disabled=!hasItems;$('saveNext').disabled=!hasItems;$('finish').disabled=!hasItems&&!state.groups.length;
        renderGroups();
      }
      return {render};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
