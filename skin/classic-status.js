(function(global){
  'use strict';
  global.PTI093ClassicStatusSkin = {
    install: function(deps){
      const $=deps.$;
      function msg(text,show=true){
        $('status').textContent=text;
        $('status').classList.toggle('hidden',!show);
      }
      function setDriveState(text,ok=true){
        const s=$('driveState');if(!s)return;
        s.textContent=text;s.className='driveState'+(ok?'':' driveWarn');
      }
      return {msg,setDriveState};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
