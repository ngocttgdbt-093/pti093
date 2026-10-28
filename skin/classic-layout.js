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
        const layoutBox=doc.querySelector('.layoutbox');
        if(layoutBox&&!$('p5GapControls')){
          const controls=doc.createElement('div');controls.id='p5GapControls';controls.className='p5-gap-controls';
          controls.innerHTML='<label for="p5RowGap">Khoảng cách dòng <output id="p5RowGapValue">18 px</output></label><input id="p5RowGap" type="range" min="4" max="36" step="2" value="18"><label for="p5ColumnGap">Khoảng cách cột <output id="p5ColumnGapValue">18 px</output></label><input id="p5ColumnGap" type="range" min="4" max="36" step="2" value="18">';
          layoutBox.appendChild(controls);
          $('p5RowGap').addEventListener('input',event=>{if(state.workspaceOpenPending)return;state.rowGap=Number(event.target.value);$('p5RowGapValue').textContent=state.rowGap+' px';renderLayout();doc.querySelector('#grid')?.style.setProperty('--p5-row-gap',state.rowGap+'px');scheduleAutoDraftSave(false);});
          $('p5ColumnGap').addEventListener('input',event=>{if(state.workspaceOpenPending)return;state.columnGap=Number(event.target.value);$('p5ColumnGapValue').textContent=state.columnGap+' px';renderLayout();doc.querySelector('#grid')?.style.setProperty('--p5-column-gap',state.columnGap+'px');scheduleAutoDraftSave(false);});
        }
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
