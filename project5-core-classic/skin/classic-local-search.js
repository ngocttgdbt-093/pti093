(function(global){
  'use strict';
  global.PTI093ClassicLocalSearchSkin={install:function(deps){
    const {document:doc,$,getLocalDrafts,openLocalDraft,msg}=deps;
    const input=$('p5LocalSearchQuery'),button=$('p5LocalSearch'),results=$('p5LocalSearchResults');
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();
    async function render(){
      if(!results)return;
      results.textContent='Đang tìm hồ sơ đã lưu…';
      try{
        const drafts=await getLocalDrafts();
        const query=normalize(input&&input.value);
        const matches=(drafts||[]).filter(d=>!query||normalize([d.caseNumber,d.bks,d.garage].join(' ')).includes(query))
          .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,30);
        results.textContent='';
        if(!matches.length){results.textContent=query?'Không tìm thấy hồ sơ khớp mã HS hoặc biển số.':'Chưa có hồ sơ nào được lưu tại máy.';return;}
        matches.forEach(draft=>{
          const row=doc.createElement('div');row.className='p5-local-search-row';
          const detail=doc.createElement('span');
          const images=(draft.sections||[]).reduce((n,s)=>n+((s.items||[]).length),0);
          detail.textContent='Mã HS: '+(draft.caseNumber||'—')+' · BKS: '+(draft.bks||'—')+' · '+images+' ảnh';
          const open=doc.createElement('button');open.type='button';open.className='btn light';open.textContent='Mở hồ sơ';
          open.addEventListener('click',async()=>{open.disabled=true;try{await openLocalDraft(draft.id);msg('✓ Đã mở hồ sơ đã lưu tại máy.',true)}catch(e){msg('Không mở được hồ sơ: '+(e&&e.message?e.message:String(e)),true)}finally{open.disabled=false}});
          row.append(detail,open);results.appendChild(row);
        });
      }catch(error){results.textContent='Không đọc được danh sách hồ sơ: '+(error&&error.message?error.message:String(error));}
    }
    if(input)input.addEventListener('input',render);
    if(button)button.addEventListener('click',render);
    return {bindControls:render,render};
  }};
})(window);
