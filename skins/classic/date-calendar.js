(function(global){
  'use strict';
  global.PTI093DateCalendarSkin = {
    install: function(deps){
      const $=deps.$, doc=deps.document||document, dateUtils=deps.dateUtils;
      if(!dateUtils||typeof dateUtils.getDateISO!=='function'||typeof dateUtils.setDateInput!=='function') {
        throw new TypeError('PTI093DateCalendarSkin requires shared date utils');
      }
      const dateInput=$('date'), calendar=$('dateCalendar'), title=$('dateCalTitle'), days=$('dateCalDays');
      const wrapper=dateInput&&dateInput.closest('.dateFieldWrap');
      if(!dateInput||!calendar||!title||!days||!wrapper)return {available:false,unmount(){}};
      let viewDate=new Date();viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
      let mounted=false;
      const pad=value=>String(value).padStart(2,'0');
      const toISO=date=>date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
      function parseSelected(){
        const iso=dateUtils.getDateISO();
        if(!iso||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
        const parts=iso.split('-').map(Number),value=new Date(parts[0],parts[1]-1,parts[2]);
        return value.getFullYear()===parts[0]&&value.getMonth()===parts[1]-1&&value.getDate()===parts[2]?value:null;
      }
      function render(){
        const year=viewDate.getFullYear(),month=viewDate.getMonth(),first=new Date(year,month,1);
        title.textContent=new Intl.DateTimeFormat('vi-VN',{month:'long',year:'numeric'}).format(viewDate);
        const offset=(first.getDay()+6)%7,start=new Date(year,month,1-offset),selected=parseSelected(),today=new Date();
        today.setHours(0,0,0,0);
        let markup='';
        for(let i=0;i<42;i++){
          const date=new Date(start);date.setDate(start.getDate()+i);
          const iso=toISO(date),isSelected=!!selected&&date.toDateString()===selected.toDateString(),isToday=date.toDateString()===today.toDateString();
          const classes=[date.getMonth()!==month?'outside':'',isToday?'today':'',isSelected?'selected':''].filter(Boolean).join(' ');
          markup+='<button type="button" data-date="'+iso+'" class="'+classes+'" aria-label="'+date.getDate()+'" aria-pressed="'+(isSelected?'true':'false')+'">'+date.getDate()+'</button>';
        }
        days.innerHTML=markup;
      }
      function show(){
        const selected=parseSelected(),now=new Date();
        viewDate=selected?new Date(selected.getFullYear(),selected.getMonth(),1):new Date(now.getFullYear(),now.getMonth(),1);
        render();calendar.classList.remove('hidden');$('datePickerBtn').setAttribute('aria-expanded','true');
      }
      function hide(){calendar.classList.add('hidden');$('datePickerBtn').setAttribute('aria-expanded','false');}
      function choose(iso){
        dateUtils.setDateInput(iso);
        dateInput.setCustomValidity('');
        dateInput.dispatchEvent(new Event('input',{bubbles:true}));
        dateInput.dispatchEvent(new Event('change',{bubbles:true}));
        hide();
      }
      function onDays(event){const button=event.target.closest('button[data-date]');if(button&&days.contains(button))choose(button.dataset.date);}
      function onPrev(){viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);render();}
      function onNext(){viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);render();}
      function onClear(){dateInput.value='';dateInput.setCustomValidity('');dateInput.dispatchEvent(new Event('input',{bubbles:true}));dateInput.dispatchEvent(new Event('change',{bubbles:true}));hide();}
      function onToday(){choose(toISO(new Date()));}
      function onOutside(event){if(!wrapper.contains(event.target))hide();}
      function onKey(event){if(event.key==='Escape'&&!calendar.classList.contains('hidden')){hide();$('datePickerBtn').focus();}}
      function mount(){
        if(mounted)return;
        $('datePickerBtn').addEventListener('click',show);
        $('dateCalPrev').addEventListener('click',onPrev);$('dateCalNext').addEventListener('click',onNext);
        days.addEventListener('click',onDays);$('dateCalClear').addEventListener('click',onClear);$('dateCalToday').addEventListener('click',onToday);
        doc.addEventListener('click',onOutside);doc.addEventListener('keydown',onKey);
        $('datePickerBtn').setAttribute('aria-expanded','false');mounted=true;
      }
      function unmount(){
        if(!mounted)return;
        $('datePickerBtn').removeEventListener('click',show);
        $('dateCalPrev').removeEventListener('click',onPrev);$('dateCalNext').removeEventListener('click',onNext);
        days.removeEventListener('click',onDays);$('dateCalClear').removeEventListener('click',onClear);$('dateCalToday').removeEventListener('click',onToday);
        doc.removeEventListener('click',onOutside);doc.removeEventListener('keydown',onKey);mounted=false;
      }
      mount();return {available:true,show,hide,render,unmount};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
