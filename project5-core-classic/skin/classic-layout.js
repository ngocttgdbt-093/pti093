(function(global){
  'use strict';
  global.PTI093ClassicLayoutSkin = {
    install: function(deps){
      const {state,$,layoutDims}=deps,doc=deps.document||document;
      const scheduleAutoDraftSave=deps.scheduleAutoDraftSave||(()=>{});
      function syncControlSelections(){
        doc.querySelectorAll('#counts .opt').forEach(item=>item.classList.toggle('on',Number(item.textContent)===state.per));
        doc.querySelectorAll('#orient .opt').forEach(item=>item.classList.toggle('on',item.dataset.o===state.orientation));
      }
      function renderLayout(){
        const box=$('layoutPreview'),txt=$('layoutText');
        if(!box)return;
        const rowInput=$('p5RowGap'),colInput=$('p5ColumnGap');
        if(rowInput){rowInput.value=String(state.rowGap||18);$('p5RowGapValue').textContent=(state.rowGap||18)+' px';}
        if(colInput){colInput.value=String(state.columnGap||18);$('p5ColumnGapValue').textContent=(state.columnGap||18)+' px';}
        box.style.rowGap=(state.rowGap||18)+'px';box.style.columnGap=(state.columnGap||18)+'px';
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
              if(state.workspaceOpenPending){syncControlSelections();return;}
              state.per=n;
              counts.querySelectorAll('.opt').forEach(item=>item.classList.remove('on'));
              button.classList.add('on');
              renderLayout();
              scheduleAutoDraftSave(false);
            };
            counts.appendChild(button);
          });
        }
        // Keep the core's default row/column spacing; redundant user-facing sliders are omitted.
        doc.querySelectorAll('#orient .opt').forEach(button=>{
          button.onclick=()=>{
            if(state.workspaceOpenPending){syncControlSelections();return;}
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
