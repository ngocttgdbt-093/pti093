(function(global){
  'use strict';
  global.PTI093ImageReorder = {
    install: function(deps){
      const {state,$,scheduleAutoDraftSave,renderLayout,render}=deps;
      let dragId='',dragMoved=false,touchTimer=null,touchStartX=0,touchStartY=0,touchSource=null;
      function ensureDragId(it){
        if(!it.__pti093DragId)it.__pti093DragId='drag-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
        return it.__pti093DragId;
      }
      function moveThumbDom(source,target,e){
        if(!source||!target||source===target)return;
        const r=target.getBoundingClientRect();
        const before=(e&&e.clientY!==undefined?e.clientY:0)<r.top+r.height/2;
        target.parentNode.insertBefore(source,before?target:target.nextSibling);
        dragMoved=true;
      }
      function syncOrderFromDOM(){
        const nodes=[...$('grid').querySelectorAll('.thumb[data-drag-id]')];
        if(!nodes.length)return false;
        const map=new Map(state.current.items.map(it=>[ensureDragId(it),it]));
        const ordered=[];
        nodes.forEach(n=>{const it=map.get(n.dataset.dragId);if(it)ordered.push(it)});
        if(ordered.length!==state.current.items.length)return false;
        const changed=ordered.some((it,i)=>it!==state.current.items[i]);
        if(changed){
          state.current.items=ordered;
          scheduleAutoDraftSave(true);
          renderLayout();
        }
        return changed;
      }
      function clearDragStyles(){
        $('grid').querySelectorAll('.thumb.dragging,.thumb.dragOver').forEach(x=>x.classList.remove('dragging','dragOver'));
      }
      function finishDrag(){
        clearTimeout(touchTimer);touchTimer=null;
        if(touchSource)touchSource.classList.remove('dragging');
        clearDragStyles();
        if(dragId&&dragMoved)syncOrderFromDOM();
        dragId='';dragMoved=false;touchSource=null;
        render();
      }
      function bindThumb(d,g){
        d.addEventListener('dragstart',e=>{
          dragId=d.dataset.dragId;dragMoved=false;d.classList.add('dragging');
          try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId)}catch(_){}
        });
        d.addEventListener('dragover',e=>{
          e.preventDefault();if(!dragId||dragId===d.dataset.dragId)return;
          d.classList.add('dragOver');
          const source=g.querySelector('.thumb[data-drag-id="'+CSS.escape(dragId)+'"]');
          if(source)moveThumbDom(source,d,e);
        });
        d.addEventListener('dragleave',()=>d.classList.remove('dragOver'));
        d.addEventListener('drop',e=>{e.preventDefault();d.classList.remove('dragOver');finishDrag()});
        d.addEventListener('dragend',()=>finishDrag());
        d.addEventListener('pointerdown',e=>{
          if(e.pointerType!=='touch'||e.target.closest('button,textarea,input,select'))return;
          touchStartX=e.clientX;touchStartY=e.clientY;touchSource=d;dragId=d.dataset.dragId;dragMoved=false;
          clearTimeout(touchTimer);
          touchTimer=setTimeout(()=>{
            if(!touchSource)return;
            touchSource.classList.add('dragging');
            try{touchSource.setPointerCapture(e.pointerId)}catch(_){}
          },380);
        });
        d.addEventListener('pointermove',e=>{
          if(e.pointerType!=='touch'||!touchSource)return;
          const dx=e.clientX-touchStartX,dy=e.clientY-touchStartY;
          if(!touchSource.classList.contains('dragging')){
            if(Math.hypot(dx,dy)>10){clearTimeout(touchTimer);touchTimer=null;touchSource=null;dragId=''}
            return;
          }
          e.preventDefault();dragMoved=true;
          const el=document.elementFromPoint(e.clientX,e.clientY),target=el&&el.closest?el.closest('.thumb'):null;
          if(!target||target===touchSource||!g.contains(target))return;
          clearDragStyles();touchSource.classList.add('dragging');target.classList.add('dragOver');
          const r=target.getBoundingClientRect(),before=e.clientY<r.top+r.height/2;
          target.parentNode.insertBefore(touchSource,before?target:target.nextSibling);
        });
        d.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&touchSource===d){e.preventDefault();finishDrag()}});
        d.addEventListener('pointercancel',e=>{if(e.pointerType==='touch'&&touchSource===d)finishDrag()});
      }
      return {ensureDragId,moveThumbDom,syncOrderFromDOM,clearDragStyles,finishDrag,bindThumb};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
