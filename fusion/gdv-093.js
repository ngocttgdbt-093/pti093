(function(global){
  'use strict';
  global.PTI093GdvFusion = {
    install: function(deps){
      const $=deps.$,promptFn=deps.prompt||global.prompt,storage=deps.storage||global.localStorage;
      const names=['Phạm Duy Thái','Đặng Xuân Linh','Nguyễn Tuấn Hưng','Đặng Xuân Diệu','Đặng Văn Hiên','Nguyễn Minh Ngọc'];
      function selectedGdv(){
        let value=$('gdv').value;
        if(!value)return 'NONAME';
        if(value==='Nhập tên khác'){
          let custom=$('gdv').dataset.custom||'';
          if(!custom)custom=promptFn('Nhập tên GĐV / Thụ lý:','');
          if(custom){
            value=custom;$('gdv').dataset.custom=custom;storage.setItem('pti093_gdv_custom',custom);
          }else value='NONAME';
        }
        return value;
      }
      function bindSelectionPersistence(scheduleAutoDraftSave=()=>{}){
        const select=$('gdv');
        const custom=storage.getItem('pti093_gdv_custom')||'';
        if(custom)select.dataset.custom=custom;
        const saved=storage.getItem('pti093_gdv')||'';
        if(saved&&[...select.options].some(option=>option.value===saved))select.value=saved;
        else if(custom)select.value='Nhập tên khác';
        select.addEventListener('change',()=>{
          if(select.value!=='Nhập tên khác'){
            if(select.value)storage.setItem('pti093_gdv',select.value);
          }else{
            const value=promptFn('Nhập tên GĐV / Thụ lý:',custom||'');
            if(value){select.dataset.custom=value;storage.setItem('pti093_gdv_custom',value);}
            else select.value='';
          }
          scheduleAutoDraftSave(false);
        });
      }
      return {names,selectedGdv,bindSelectionPersistence};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
