(function(global){
  'use strict';
  global.PTI093ClassicGroupListSkin = {
    install: function(deps){
      const {state,$,onEditGroup}=deps,doc=deps.document||document;
      function renderGroups(){
        const box=$('groupsBox');box.innerHTML='';
        if(!state.groups.length){
          box.innerHTML='<div class="muted">Chưa có nội dung nào được lưu. Bạn có thể chỉ làm 1 nội dung và bấm “Kết thúc & xem Preview”.</div>';
          return;
        }
        const heading=doc.createElement('div');heading.className='muted';heading.style.fontWeight='700';heading.textContent='Các nội dung đã lưu';box.appendChild(heading);
        state.groups.forEach((group,index)=>{
          const row=doc.createElement('div');
          row.style.cssText='margin-top:8px;padding:10px;border:1px solid #dbe4df;border-radius:8px;background:#fbfdfc;display:flex;justify-content:space-between;align-items:center;gap:8px';
          const label=doc.createElement('span');
          label.innerHTML=`<b>${index+1}. ${group.title}</b> · ${group.items.length} ảnh`;
          const button=doc.createElement('button');button.className='btn light';button.textContent='✎ Sửa';
          button.onclick=()=>onEditGroup(index);
          row.append(label,button);box.appendChild(row);
        });
      }
      return {renderGroups};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
