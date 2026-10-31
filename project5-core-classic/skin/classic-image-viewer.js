(function(global){
  'use strict';
  global.PTI093ClassicImageViewerSkin = {
    install: function(deps){
      const doc=deps.document||document,urlApi=deps.URL||URL;
      function openImageViewer(it,index){
        if(!it||!it.file)return;
        const old=doc.querySelector('.pti093Viewer');if(old)old.remove();
        const url=urlApi.createObjectURL(it.file);
        const wrap=doc.createElement('div');wrap.className='pti093Viewer';
        const title=doc.createElement('div');title.className='pti093ViewerTitle';title.textContent='Ảnh số '+(Number(index)+1);
        const img=doc.createElement('img');img.src=url;img.alt='Ảnh số '+(Number(index)+1);img.style.transform='rotate('+(((it.rotate||0)%360+360)%360)+'deg)';
        const close=doc.createElement('button');close.className='pti093ViewerClose';close.type='button';close.textContent='×';close.title='Đóng';
        const cleanup=()=>{urlApi.revokeObjectURL(url);wrap.remove();doc.removeEventListener('keydown',onKey)};
        const onKey=e=>{if(e.key==='Escape')cleanup()};
        close.onclick=cleanup;
        wrap.addEventListener('click',e=>{if(e.target===wrap)cleanup()});
        wrap.append(title,img,close);doc.body.appendChild(wrap);doc.addEventListener('keydown',onKey);
      }
      return {openImageViewer};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
