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
        location.reload();
        return true;
      }
      $('newCase').onclick=startNewCase;
      return {startNewCase};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
