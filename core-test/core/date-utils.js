(function(global){
  'use strict';
  global.PTI093DateUtils = {
    install: function(deps){
      const $ = deps.$;
      function formatDateDMY(value){
        const v=String(value||'').trim();
        if(/^\d{4}-\d{2}-\d{2}$/.test(v)){
          const [y,m,d]=v.split('-');
          return `${d}/${m}/${y}`;
        }
        return v;
      }
      function getDateISO(){
        const v=String($('date').value||'').trim();
        let m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if(m){
          const d=m[1].padStart(2,'0'),mo=m[2].padStart(2,'0'),y=m[3];
          const dt=new Date(Number(y),Number(mo)-1,Number(d));
          if(dt.getFullYear()===Number(y)&&dt.getMonth()===Number(mo)-1&&dt.getDate()===Number(d))return `${y}-${mo}-${d}`;
          return '';
        }
        if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
        return '';
      }
      function setDateInput(value){$('date').value=formatDateDMY(value||'');}
      $('date').addEventListener('input',()=>{
        const el=$('date'),raw=el.value,caret=el.selectionStart??raw.length;
        const digitsBefore=raw.slice(0,caret).replace(/\D/g,'').length;
        const digits=raw.replace(/\D/g,'').slice(0,8);
        let formatted=digits.slice(0,2);
        if(digits.length>=2)formatted+='/';
        if(digits.length>2)formatted+=digits.slice(2,4);
        if(digits.length>=4)formatted+='/';
        if(digits.length>4)formatted+=digits.slice(4,8);
        el.value=formatted;
        let pos=0,count=0;
        while(pos<formatted.length&&count<digitsBefore){if(/\d/.test(formatted[pos]))count++;pos++;}
        if((digitsBefore===2&&digits.length>=2)||(digitsBefore===4&&digits.length>=4)){if(formatted[pos]==='/')pos++;}
        el.setSelectionRange(pos,pos);
      });
      $('date').addEventListener('blur',()=>{
        const v=$('date').value.trim();
        if(!v)return;
        const iso=getDateISO();
        if(iso)$('date').value=formatDateDMY(iso);
      });
      return {formatDateDMY,getDateISO,setDateInput};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
