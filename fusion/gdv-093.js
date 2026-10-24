(function(global){
  'use strict';
  global.PTI093GdvFusion = {
    install: function(deps){
      const $=deps.$,promptFn=deps.prompt||global.prompt,storage=deps.storage||global.localStorage,state=deps.state;
      const names=['Phạm Duy Thái','Đặng Xuân Linh','Nguyễn Tuấn Hưng','Đặng Xuân Diệu','Đặng Văn Hiên','Nguyễn Minh Ngọc'];
      function readStored(key){
        try{return storage.getItem(key)||''}catch(e){return ''}
      }
      function writeStored(key,value){
        try{storage.setItem(key,value)}catch(e){}
      }
      function selectedGdv(){
        let value=$('gdv').value;
        if(!value)return 'NONAME';
        if(value==='Nhập tên khác'){
          let custom=$('gdv').dataset.custom||'';
          if(!custom)custom=promptFn('Nhập tên GĐV / Thụ lý:','');
          if(custom){
            value=custom;$('gdv').dataset.custom=custom;writeStored('pti093_gdv_custom',custom);
          }else value='NONAME';
        }
        return value;
      }
      function bindSelectionPersistence(scheduleAutoDraftSave=()=>{}){
        const select=$('gdv');
        const custom=readStored('pti093_gdv_custom');
        if(custom)select.dataset.custom=custom;
        const saved=readStored('pti093_gdv');
        if(saved&&[...select.options].some(option=>option.value===saved))select.value=saved;
        else if(custom)select.value='Nhập tên khác';
        select.addEventListener('change',()=>{
          // Opening/saving a workspace is serialized; don't persist a transient selection
          // made while the active case is being replaced or saved.
          if(state&&state.workspaceOpenPending)return;
          if(select.value!=='Nhập tên khác'){
            if(select.value)writeStored('pti093_gdv',select.value);
          }else{
            const value=promptFn('Nhập tên GĐV / Thụ lý:',custom||'');
            if(value){select.dataset.custom=value;writeStored('pti093_gdv_custom',value);}
            else select.value='';
          }
          scheduleAutoDraftSave(false);
        });
      }
      return {names,selectedGdv,bindSelectionPersistence};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
