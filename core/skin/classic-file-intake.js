(function(global){
  'use strict';
  global.PTI093ClassicFileIntakeSkin = {
    install: function(deps){
      const {$,addFiles}=deps,drop=$('drop');
      $('files').addEventListener('change',event=>{addFiles([...event.target.files]);event.target.value='';});
      $('folder').addEventListener('change',event=>{addFiles([...event.target.files]);event.target.value='';});
      ['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();event.stopPropagation();drop.classList.add('drag');}));
      ['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();event.stopPropagation();if(name==='dragleave')drop.classList.remove('drag');}));
      drop.addEventListener('drop',event=>{drop.classList.remove('drag');addFiles([...event.dataTransfer.files]);});
      return {};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
