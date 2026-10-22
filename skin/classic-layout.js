(function(global){
  'use strict';
  global.PTI093ClassicLayoutSkin = {
    install: function(deps){
      const {state,$,layoutDims}=deps,doc=deps.document||document;
      const scheduleAutoDraftSave=deps.scheduleAutoDraftSave||(()=>{});
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
      function bindControls(){
        const counts=$('counts');
        if(counts){
          counts.innerHTML='';
          [1,2,3,4,6,8].forEach(n=>{
            const button=doc.createElement('button');
            button.className='opt'+(n===6?' on':'');
            button.textContent=n;
            button.onclick=()=>{
              state.per=n;
              counts.querySelectorAll('.opt').forEach(item=>item.classList.remove('on'));
              button.classList.add('on');
              renderLayout();
              scheduleAutoDraftSave(false);
            };
            counts.appendChild(button);
          });
        }
        doc.querySelectorAll('#orient .opt').forEach(button=>{
          button.onclick=()=>{
            state.orientation=button.dataset.o;
            doc.querySelectorAll('#orient .opt').forEach(item=>item.classList.remove('on'));
            button.classList.add('on');
            renderLayout();
            scheduleAutoDraftSave(false);
          };
        });
      }
      return {renderLayout,bindControls};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
