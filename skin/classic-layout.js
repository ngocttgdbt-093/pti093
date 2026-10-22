(function(global){
  'use strict';
  global.PTI093ClassicLayoutSkin = {
    install: function(deps){
      const {state,$,layoutDims}=deps,doc=deps.document||document;
      function renderLayout(){
        const box=$('layoutPreview'),txt=$('layoutText');
        if(!box)return;
        const d=layoutDims();
        box.style.gridTemplateColumns=`repeat(${d.cols},1fr)`;
        box.innerHTML='';
        for(let i=0;i<state.per;i++){
          const cell=doc.createElement('div');cell.className='layoutcell';cell.textContent=i+1;box.appendChild(cell);
        }
        txt.textContent=`${state.per} ảnh · ${state.orientation==='portrait'?'A4 dọc':'A4 ngang'} · ${d.cols} × ${d.rows}`;
      }
      return {renderLayout};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
