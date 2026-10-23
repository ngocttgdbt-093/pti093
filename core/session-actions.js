(function(global){
  'use strict';
  global.PTI093SessionActions = {
    install: function(deps){
      const {$,clearAutoDraft,localStorage,location,console,msg}=deps;
      async function startNewCase(){
        let storedCustomGdv='';
        if($('gdv').value==='Nhập tên khác'&&!$('gdv').dataset.custom){
          try{storedCustomGdv=localStorage.getItem('pti093_gdv_custom')||''}catch(e){}
        }
        const gdv=$('gdv').value==='Nhập tên khác'
          ? ($('gdv').dataset.custom||storedCustomGdv)
          : ($('gdv').value||'');
        if(gdv){try{localStorage.setItem('pti093_gdv',gdv)}catch(e){}}
        const button=$('newCase');
        button.disabled=true;
        try{
          await clearAutoDraft();
        }catch(error){
          console.warn('Không thể dọn bản nháp trước khi bắt đầu hồ sơ mới:',error);
          button.disabled=false;
          if(msg)msg('Chưa thể bắt đầu hồ sơ mới vì bản nháp cũ chưa được dọn. Hãy thử lại để tránh khôi phục nhầm hồ sơ cũ.');
          return false;
        }
        // A new case must not inherit the previous Drive record ID; otherwise Fusion may
        // interpret the next "create" action as an update to the previous record.
        try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
        try{localStorage.removeItem('pti093_driveRecordId')}catch(e){}
        location.reload();
        return true;
      }
      $('newCase').onclick=startNewCase;
      return {startNewCase};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
