(function(global){
  'use strict';
  global.PTI093FileDelivery = {
    install: function(deps){
      const {navigator,window,document,URL,File,location,setTimeout} = deps;
      async function exportPdfFile(blob,filename){
        const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
        let url='';
        try{
          if(isiOS){
            const file=new File([blob],filename,{type:'application/pdf'});
            if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
              await navigator.share({files:[file],title:filename});
              return;
            }
            url=URL.createObjectURL(blob);
            const w=window.open(url,'_blank');
            if(!w) location.href=url;
            setTimeout(()=>URL.revokeObjectURL(url),60000);
            return;
          }
          url=URL.createObjectURL(blob);
          const a=document.createElement('a');
          a.href=url;
          a.download=filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),3000);
        }catch(e){
          if(url)URL.revokeObjectURL(url);
          throw e;
        }
      }
      return {exportPdfFile};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
