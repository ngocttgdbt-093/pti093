(function(global){
  'use strict';
  global.PTI093SessionActions = {
    install: function(deps){
      const {$,clearAutoDraft,localStorage,location,console}=deps;
      async function startNewCase(){
        const gdv=$('gdv').value==='Nhập tên khác'
          ? ($('gdv').dataset.custom||localStorage.getItem('pti093_gdv_custom')||'')
          : ($('gdv').value||'');
        if(gdv)localStorage.setItem('pti093_gdv',gdv);
        $('newCase').disabled=true;
        try{await clearAutoDraft()}catch(error){console.warn(error)}
        location.reload();
      }
      $('newCase').onclick=startNewCase;
      return {startNewCase};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
