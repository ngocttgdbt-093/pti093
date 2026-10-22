(function(global){
  'use strict';
  global.PTI093PreviewBuilder = {
    install: function(deps){
      const {drawPage} = deps;
      async function buildPreview(groups,imagesPerPage){
        const per=Math.max(1,Number(imagesPerPage)||1);
        const pages=[],defs=[];
        let pageNo=1;
        for(const group of groups||[]){
          const items=group.items||[];
          const groupPages=Math.ceil(items.length/per);
          for(let start=0;start<items.length;start+=per){
            const pageItems=items.slice(start,start+per);
            const groupPageNo=Math.floor(start/per)+1;
            const def={group,pageItems,pageNo,groupPageNo,groupPages,groupStartIndex:start};
            defs.push(def);
            pages.push(await drawPage(group,pageItems,pageNo,groupPageNo,groupPages,start));
            pageNo++;
          }
        }
        return {pages,defs,totalImages:(groups||[]).reduce((sum,group)=>sum+((group.items||[]).length),0)};
      }
      return {buildPreview};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
