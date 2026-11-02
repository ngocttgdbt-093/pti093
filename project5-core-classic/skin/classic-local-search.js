(function(global){
  'use strict';
  global.PTI093ClassicLocalSearchSkin={install:function(deps){
    const {document:doc,$,getLocalDrafts,openLocalDraft,msg}=deps;
    const input=$('p5LocalSearchQuery'),button=$('p5LocalSearch'),clearButton=$('p5LocalSearchClear'),results=$('p5LocalSearchResults');
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    let renderRequest=0;
    function message(text,state){
      if(!results)return;
      results.dataset.state=state;
      results.textContent=text;
    }
    function clear(){
      renderRequest++;
      if(input)input.value='';
      message("Nhập mã HS, biển số xe hoặc tên GĐV để tìm hồ sơ đã lưu tại máy.",'idle');
    }
    async function render(){
      if(!results)return;
      const request=++renderRequest;
      const query=normalize(input&&input.value);
      if(!query){message("Nhập mã HS, biển số xe hoặc tên GĐV để tìm hồ sơ đã lưu tại máy.",'idle');return;}
      message('Đang tìm hồ sơ đã lưu…','loading');
      try{
        const drafts=await getLocalDrafts();
        if(request!==renderRequest)return;
        const matches=(drafts||[])
          .filter(d=>!String(d.id||'').startsWith('AUTO-DRAFT'))
          .filter(d=>normalize([d.caseNumber,d.bks,d.gdv].join(' ')).includes(query))
          .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,30);
        if(!matches.length){message('Không tìm thấy hồ sơ khớp mã HS, biển số hoặc tên GĐV.','empty');return;}
        results.textContent='';
        results.dataset.state='results';
        matches.forEach(draft=>{
          const row=doc.createElement('div');row.className='p5-local-search-row';
          const detail=doc.createElement('span');detail.className='p5-local-search-detail';
          const images=(draft.sections||[]).reduce((n,s)=>n+((s.items||[]).length),0);
          const summary=doc.createElement('span');
          summary.textContent='Mã HS: '+(draft.caseNumber||'—')+' · BKS: '+(draft.bks||'—')+' · GĐV: '+(draft.gdv||'—')+' · '+images+' ảnh';
          const saved=doc.createElement('span');saved.className='p5-local-search-saved';
          saved.style.cssText='display:block;margin-top:3px;font-size:12px;color:#5b6870;line-height:1.45';
          const savedAt=new Date(draft.updatedAt||draft.createdAt||'');
          const savedLabel=Number.isNaN(savedAt.getTime())?'Thời điểm lưu không có':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(savedAt);
          saved.textContent='Lưu lúc: '+savedLabel+' · ID: '+(draft.id||'—');
          detail.append(summary,saved);
          const open=doc.createElement('button');open.type='button';open.className='p5-local-search-open';open.textContent='Mở hồ sơ';
          open.addEventListener('click',async()=>{
            open.disabled=true;
            try{await openLocalDraft(draft.id);clear();msg('✓ Đã mở hồ sơ đã lưu tại máy.',true)}
            catch(e){msg('Không mở được hồ sơ: '+(e&&e.message?e.message:String(e)),true)}
            finally{open.disabled=false}
          });
          row.append(detail,open);results.appendChild(row);
        });
      }catch(error){if(request===renderRequest)message('Không đọc được danh sách hồ sơ: '+(error&&error.message?error.message:String(error)),'error');}
    }
    if(input){
      input.addEventListener('input',render);
      input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();render()}else if(event.key==='Escape')clear()});
    }
    if(button)button.addEventListener('click',render);
    if(clearButton)clearButton.addEventListener('click',clear);
    return {bindControls:render,render,clear};
  }};
})(window);
