(function(root,doc){
  'use strict';
  function install(){
    const input=doc.getElementById('date'),api=root.PTI093DateAPI;
    if(!input||!api||input.dataset.classicCalendarBound==='1')return;
    input.dataset.classicCalendarBound='1';
    const wrap=doc.createElement('div');wrap.className='dateFieldWrap';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const trigger=doc.createElement('button');trigger.type='button';trigger.className='datePickerBtn';trigger.setAttribute('aria-label','Mở lịch chọn ngày');trigger.setAttribute('aria-expanded','false');trigger.textContent='▦';wrap.appendChild(trigger);
    const popup=doc.createElement('div');popup.className='dateCalendar';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Lịch chọn ngày');
    popup.innerHTML='<div class="dateCalHead"><button type="button" data-step="-1" aria-label="Tháng trước">‹</button><strong data-title></strong><button type="button" data-step="1" aria-label="Tháng sau">›</button></div><div class="dateCalWeek"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div><div class="dateCalDays"></div><div class="dateCalFoot"><button type="button" data-action="clear">Xóa</button><button type="button" data-action="today">Hôm nay</button></div>';
    wrap.appendChild(popup);
    let month=new Date();month=new Date(month.getFullYear(),month.getMonth(),1);
    const isoOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const today=()=>isoOf(new Date());
    function selectedIso(){return typeof api.getDateISO==='function'?api.getDateISO():'';}
    function render(){
      popup.querySelector('[data-title]').textContent=month.toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
      const days=popup.querySelector('.dateCalDays');days.replaceChildren();
      const firstOffset=(month.getDay()+6)%7,start=new Date(month.getFullYear(),month.getMonth(),1-firstOffset),selected=selectedIso(),todayIso=today();
      for(let i=0;i<42;i++){
        const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),iso=isoOf(date),btn=doc.createElement('button');
        btn.type='button';btn.textContent=String(date.getDate());btn.dataset.date=iso;
        if(date.getMonth()!==month.getMonth())btn.classList.add('outside');
        if(iso===todayIso)btn.classList.add('today');
        if(iso===selected)btn.classList.add('selected');
        btn.addEventListener('click',()=>choose(iso));days.appendChild(btn);
      }
    }
    function choose(iso){
      api.setDateInput(iso);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      close();
    }
    function open(){
      const current=selectedIso();if(current){const parts=current.split('-').map(Number);month=new Date(parts[0],parts[1]-1,1);}
      else {const now=new Date();month=new Date(now.getFullYear(),now.getMonth(),1);}
      render();popup.hidden=false;trigger.setAttribute('aria-expanded','true');
    }
    function close(){popup.hidden=true;trigger.setAttribute('aria-expanded','false');}
    trigger.addEventListener('click',()=>popup.hidden?open():close());
    popup.querySelectorAll('[data-step]').forEach(btn=>btn.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+Number(btn.dataset.step),1);render();}));
    popup.querySelector('[data-action="today"]').addEventListener('click',()=>choose(today()));
    popup.querySelector('[data-action="clear"]').addEventListener('click',()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));close();});
    doc.addEventListener('pointerdown',event=>{if(!wrap.contains(event.target))close();});
    input.addEventListener('focus',()=>{if(!popup.hidden)render();});
    input.addEventListener('change',()=>{if(!popup.hidden)render();});
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window,document);
