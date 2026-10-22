(function(global){
  'use strict';
  global.PTI093DeviceContext = {
    install: function(deps){
      const {navigator}=deps;
      function deviceStorageLabel(){
        const ua=navigator.userAgent||'';
        if(/iPhone|iPad|iPod/i.test(ua))return 'iPhone/iPad';
        if(/Android/i.test(ua))return 'điện thoại Android';
        return 'PC';
      }
      return {deviceStorageLabel};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
