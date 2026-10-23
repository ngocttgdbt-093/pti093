(function(global){
  'use strict';
  global.PTI093PdfExportCore = {
    install: function(deps){
      const {state,PDF_SAFE_LIMIT,drawPage,makePdfAt,pagePixels,jpegQuality,pdfPackSize}=deps;
      async function renderPageRangeWithLabel(start,end,label,totalParts){
        const out=[];
        for(let i=start;i<end;i++){
          const d=state.pageDefs[i];
          out.push(await drawPage(d.group,d.pageItems,d.pageNo,d.groupPageNo,d.groupPages,d.groupStartIndex,label));
        }
        return out;
      }
      async function buildPartWithinLimit(canvases){
        let result=makePdfAt(canvases,pagePixels().dpi,jpegQuality());
        if(pdfPackSize(result.bytes)<=safe)return result;
        // A single raster page can exceed the cap by itself; page splitting cannot fix that.
        // Retry that part at progressively lower DPI/quality and never return an oversized file.
        const fallbacks=[{dpi:120,quality:.72},{dpi:100,quality:.65},{dpi:85,quality:.58},{dpi:72,quality:.52},{dpi:60,quality:.46},{dpi:50,quality:.40},{dpi:40,quality:.34}];
        for(const attempt of fallbacks){
          result=makePdfAt(canvases,attempt.dpi,attempt.quality);
          if(pdfPackSize(result.bytes)<=safe)return result;
          await new Promise(resolve=>setTimeout(resolve,0));
        }
        throw new Error('Một trang PDF vẫn vượt giới hạn an toàn sau khi giảm DPI/chất lượng. Không xuất tệp vượt giới hạn.');
      }
      async function splitHighQualityPdf(filenameBase,onProgress=()=>{}){
        const pages=state.pages||[],safe=PDF_SAFE_LIMIT;
        if(!pages.length)return [];
        const ranges=[];let start=0;
        while(start<pages.length){
          let bestEnd=start+1;
          for(let end=start+1;end<=pages.length;end++){
            const trial=makePdfAt(pages.slice(start,end),pagePixels().dpi,jpegQuality());
            if(pdfPackSize(trial.bytes)<=safe)bestEnd=end;else break;
            if(end%2===0){onProgress(5+Math.round(start/pages.length*30),'Đang tính cách chia PDF…');await new Promise(resolve=>setTimeout(resolve,0))}
          }
          ranges.push([start,bestEnd]);start=bestEnd;
          onProgress(5+Math.round(start/pages.length*30),'Đã xác định '+start+'/'+pages.length+' trang');
          await new Promise(resolve=>setTimeout(resolve,0));
        }
        const parts=[];
        for(let pi=0;pi<ranges.length;pi++){
          const [s,e]=ranges[pi],label=`${pi+1}/${ranges.length}`;
          onProgress(35+Math.round(pi/Math.max(1,ranges.length)*45),'Đang dựng PDF phần '+(pi+1)+'/'+ranges.length+'…');
          await new Promise(resolve=>setTimeout(resolve,0));
          const canvases=await renderPageRangeWithLabel(s,e,label,ranges.length);
          let result=makePdfAt(canvases,pagePixels().dpi,jpegQuality());
          if(pdfPackSize(result.bytes)>safe&&e-s>1){const ne=e-1;ranges[pi]=[s,ne];ranges.splice(pi+1,0,[ne,e]);pi--;continue}
          if(pdfPackSize(result.bytes)>safe)result=await buildPartWithinLimit(canvases);
          parts.push({blob:new Blob([result.bytes],{type:'application/pdf'}),filename:filenameBase.replace(/\.pdf$/i,'')+' '+(pi+1)+'.pdf',dpi:result.dpi,quality:result.quality});
          onProgress(35+Math.round((pi+1)/Math.max(1,ranges.length)*45),'Đã dựng '+(pi+1)+'/'+ranges.length+' tệp PDF');
        }
        if(parts.length!==ranges.length){
          parts.length=0;const total=ranges.length;
          for(let pi=0;pi<ranges.length;pi++){
            onProgress(35+Math.round(pi/Math.max(1,total)*45),'Đang hoàn thiện nhãn tệp '+(pi+1)+'/'+total+'…');
            const [s,e]=ranges[pi],label=`${pi+1}/${total}`;
            const canvases=await renderPageRangeWithLabel(s,e,label,total);
            const result=await buildPartWithinLimit(canvases);
            parts.push({blob:new Blob([result.bytes],{type:'application/pdf'}),filename:filenameBase.replace(/\.pdf$/i,'')+' '+(pi+1)+'.pdf',dpi:result.dpi,quality:result.quality});
            await new Promise(resolve=>setTimeout(resolve,0));
          }
        }
        return parts;
      }
      return {renderPageRangeWithLabel,splitHighQualityPdf};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
