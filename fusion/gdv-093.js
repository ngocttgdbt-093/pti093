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
      return {names,selectedGdv};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
