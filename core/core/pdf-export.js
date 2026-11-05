(function(global){
  'use strict';
  global.PTI093PdfExportCore = {
    install: function(deps){
      const {state,PDF_SAFE_LIMIT,drawPage,makePdfAt,pagePixels,jpegQuality,pdfPackSize,buildAdaptivePdf}=deps;
      async function renderPageRangeWithLabel(start,end,label,totalParts,pageDefs=state.pageDefs){
        const out=[];
        for(let i=start;i<end;i++){
          const d=pageDefs[i];
          out.push(await drawPage(d.group,d.pageItems,d.pageNo,d.groupPageNo,d.groupPages,d.groupStartIndex,label));
        }
        return out;
      }
async function splitHighQualityPdf(filenameBase,onProgress=()=>{},snapshot=null){
  const pages=(snapshot&&snapshot.pages)||state.pages||[];
  const defs=(snapshot&&snapshot.pageDefs)||state.pageDefs||[];
  const safe=9999999; // Strictly below 10 decimal MB, including PDF structure and labels.
  if(!pages.length)return [];
  let totalHint=1;
  // Repack the entire remaining sequence after every boundary. Never insert an orphan part.
  // Rebuild when the denominator changes so all final labels and measured bytes agree.
  for(let pass=0;pass<12;pass++){
    const parts=[];let start=0;
    while(start<pages.length){
      const partNo=parts.length+1,label=partNo+'/'+totalHint;
      const encoded=[];let end=start,best=null;
      while(end<pages.length){
        const d=defs[end];
        const canvas=await drawPage(d.group,d.pageItems,d.pageNo,d.groupPageNo,d.groupPages,d.groupStartIndex,label);
        try{
          const jpeg=canvas.toDataURL('image/jpeg',jpegQuality());
          const cached={width:canvas.width,height:canvas.height,toDataURL:()=>jpeg};
          let trial=makePdfAt(encoded.concat(cached),pagePixels().dpi,jpegQuality());
          if(pdfPackSize(trial.bytes)>safe){
            if(encoded.length)break;
            // Only an individually oversized page may need quality reduction.
            trial=await buildAdaptivePdf([canvas]);
            if(pdfPackSize(trial.bytes)>safe)throw new Error('Một trang vẫn vượt 10 MB sau khi nén. Không xuất file vượt giới hạn.');
          }
          encoded.push(cached);best=trial;end++;
        }finally{
          // Preserve the Preview canvases; release only the temporary rendered page.
          if(!pages.includes(canvas)){canvas.width=1;canvas.height=1;}
        }
        onProgress(Math.min(90,5+Math.round(end/pages.length*80)),'Bước 2 · Đang chia PDF: '+end+'/'+pages.length+' trang · lượt '+(pass+1));
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(!best||end<=start)throw new Error('Không thể chia PDF trong giới hạn 10 MB.');
      parts.push({blob:new Blob([best.bytes],{type:'application/pdf'}),filename:filenameBase.replace(/\.pdf$/i,'')+' '+partNo+'.pdf',dpi:best.dpi,quality:best.quality});
      start=end;
    }
    if(parts.length===totalHint){onProgress(95,'Đã chia đủ '+parts.length+' PDF; đang chuẩn bị tải…');return parts;}
    totalHint=parts.length;
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('Chưa ổn định được nhãn số phần PDF. Hãy thử xuất lại; chưa tải file nào.');
}
      return {renderPageRangeWithLabel,splitHighQualityPdf};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
