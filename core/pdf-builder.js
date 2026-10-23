(function(global){
  'use strict';
  global.PTI093PdfBuilder = {
    install: function(deps){
      const {state, PDF_SAFE_LIMIT} = deps;
      function pagePixels(){/* A4 render: enough pixels for crisp PDF while avoiding oversized raster pages. */
        const dpi=state.per===1?180:(state.per<=4?165:150);
        const mmPerIn=25.4, a4w=state.orientation==='landscape'?297:210, a4h=state.orientation==='landscape'?210:297;
        return {W:Math.round(a4w/mmPerIn*dpi),H:Math.round(a4h/mmPerIn*dpi),dpi};
      }

      function jpegQuality(){/* More images = smaller cells, so excessive JPEG quality only inflates the PDF. */
        return state.per===1?0.88:(state.per<=4?0.84:0.80);
      }

      function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}

      function pdfBytesFromCanvases(canvases,qualityOverride){const enc=new TextEncoder(),chunks=[],objs=[];let off=0;const add=s=>{const b=enc.encode(s);chunks.push(b);off+=b.length};const obj=(n,body)=>{objs[n]=off;add(`${n} 0 obj\n${body}\nendobj\n`)};const streamObj=(n,dict,bytes)=>{objs[n]=off;add(`${n} 0 obj\n${dict}\nstream\n`);chunks.push(bytes);off+=bytes.length;add(`\nendstream\nendobj\n`)};add('%PDF-1.4\n%âãÏÓ\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');const pageIds=[];for(let i=0;i<canvases.length;i++){const pid=3+i*3,imgid=4+i*3,contid=5+i*3;pageIds.push(pid);const pw=state.orientation==='landscape'?841.89:595.28,ph=state.orientation==='landscape'?595.28:841.89;obj(pid,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i+1} ${imgid} 0 R >> >> /Contents ${contid} 0 R >>`);const c=canvases[i],raw=atob(c.toDataURL('image/jpeg',qualityOverride==null?jpegQuality():qualityOverride).split(',')[1]),u=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)u[j]=raw.charCodeAt(j);streamObj(imgid,`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${u.length} >>`,u);const cb=enc.encode(`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${i+1} Do\nQ\n`);streamObj(contid,`<< /Length ${cb.length} >>`,cb)}obj(2,`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] >>`);const xref=off;add(`xref\n0 ${objs.length}\n0000000000 65535 f \n`);for(let i=1;i<objs.length;i++)add(String(objs[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);const total=chunks.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let p=0;for(const b of chunks){out.set(b,p);p+=b.length}return out}

      function resamplePdfCanvases(canvases,targetDpi){
        const src=pagePixels(),scale=targetDpi/src.dpi;
        if(scale>=0.999)return canvases;
        return canvases.map(srcCanvas=>{
          const w=Math.max(1,Math.round(srcCanvas.width*scale)),h=Math.max(1,Math.round(srcCanvas.height*scale));
          const out=makeCanvas(w,h),ctx=out.getContext('2d');
          ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
          ctx.drawImage(srcCanvas,0,0,w,h);
          return out;
        });
      }

      function pdfPackSize(bytes){return bytes.byteLength||bytes.length||0}

      function makePdfAt(canvases,dpi,quality){return {bytes:pdfBytesFromCanvases(resamplePdfCanvases(canvases,dpi),quality),dpi,quality}}

      async function buildAdaptivePdf(canvases){
        const tries=[
          {dpi:pagePixels().dpi,quality:jpegQuality()},
          {dpi:120,quality:.72},
          {dpi:100,quality:.65},
          {dpi:85,quality:.58},
          {dpi:72,quality:.52},
          {dpi:60,quality:.46},
          {dpi:50,quality:.40},
          {dpi:40,quality:.34}
        ];
        let last=null;
        for(const t of tries){
          const result=makePdfAt(canvases,t.dpi,t.quality);last=result;
          if(pdfPackSize(result.bytes)<=PDF_SAFE_LIMIT)return {...result,compressed:t.dpi!==pagePixels().dpi};
        }
        throw new Error('PDF vẫn vượt giới hạn dung lượng sau khi nén tối đa. Không xuất tệp vượt giới hạn; hãy dùng chế độ PDF chất lượng cao để tự chia thành nhiều phần.');
      }

      function splitPdfBytes(canvases,filenameBase){
        return (async()=>{
          const parts=[];let start=0,partNo=1;
          while(start<canvases.length){
            let low=start+1,high=canvases.length,best=null;
            while(low<=high){
              const mid=Math.floor((low+high)/2);
              const trial=await buildAdaptivePdf(canvases.slice(start,mid));
              if(pdfPackSize(trial.bytes)<=PDF_SAFE_LIMIT){best={end:mid,...trial};low=mid+1}
              else high=mid-1;
            }
            if(!best){
              const fallbackDpi=[60,50,40];let one=null;
              for(const dpi of fallbackDpi){const q=dpi===60?.46:dpi===50?.40:.34;const r=makePdfAt(canvases.slice(start,start+1),dpi,q);one=r;if(pdfPackSize(r.bytes)<=PDF_SAFE_LIMIT)break}
              best={end:start+1,...one};
            }
            parts.push({blob:new Blob([best.bytes],{type:'application/pdf'}),filename:filenameBase.replace(/\.pdf$/i,'')+' Phan '+partNo+'.pdf',dpi:best.dpi,quality:best.quality});
            start=best.end;partNo++;
          }
          return parts;
        })();
      }
      return {pagePixels,jpegQuality,makeCanvas,pdfBytesFromCanvases,resamplePdfCanvases,pdfPackSize,makePdfAt,buildAdaptivePdf,splitPdfBytes};
    }
  };
})(window);
