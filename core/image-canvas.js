(function(global){
  'use strict';
  global.PTI093ImageCanvasCore = {
    install: function(deps){
      const {state, $, pagePixels, makeCanvas, formatDateDMY, getDateISO, getLogoSrc, getSelectedGdvCache} = deps;
      function layoutDims(){const n=state.per;let cols,rows;if(n===1){cols=1;rows=1}else if(n===2){cols=2;rows=1}else if(n===3){cols=3;rows=1}else if(n===4){cols=2;rows=2}else if(n===6){cols=state.orientation==='portrait'?2:3;rows=state.orientation==='portrait'?3:2}else{cols=state.orientation==='portrait'?2:4;rows=state.orientation==='portrait'?4:2}return {cols,rows}}

      function loadImage(f){return new Promise((r,j)=>{const im=new Image(),url=URL.createObjectURL(f);let settled=false;const cleanup=()=>{if(settled)return;settled=true;try{URL.revokeObjectURL(url)}catch(e){}};im.onload=()=>{cleanup();r(im)};im.onerror=error=>{cleanup();j(error||new Error('Không đọc được ảnh để dựng PDF.'))};im.src=url})}

      function loadLogo(){return new Promise((r,j)=>{const im=new Image();im.onload=()=>r(im);im.onerror=j;im.src=getLogoSrc()})}

      function wrap(ctx,text,max,font){if(!text)return[];ctx.font=`400 ${font}px Arial`;const words=text.split(/\s+/),out=[];let line='';for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width<=max)line=t;else{if(line)out.push(line);line=w}}if(line)out.push(line);return out}

      function drawContainRotated(ctx,img,cx,cy,maxW,maxH,angle){const a=((angle||0)%360+360)%360;const swap=(a===90||a===270);const rw=swap?img.height:img.width,rh=swap?img.width:img.height;const sc=Math.min(maxW/rw,maxH/rh),dw=img.width*sc,dh=img.height*sc;ctx.save();ctx.translate(cx,cy);ctx.rotate(a*Math.PI/180);ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.restore();}

      async function drawPage(group,pageItems,pageNo,groupPageNo,groupPages,groupStartIndex=0,partLabel=''){
        // Giữ cố định bố cục theo số ảnh/trang mà GĐV đã chọn.
        // Trang cuối thiếu ảnh vẫn giữ nguyên số cột/hàng và đặt ảnh từ vị trí đầu tiên.
        // Ví dụ chọn 6 ảnh/trang (A4 dọc = 2x3): trang cuối có 2 ảnh sẽ nằm ở vị trí 1,2 của lưới 2x3.
        const numberBase=Number.isFinite(groupStartIndex)?groupStartIndex:0;
        const landscape=state.orientation==='landscape',px=pagePixels(),W=px.W,H=px.H;
        const c=makeCanvas(W,H),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
        const m=45,footer=70,showHeader=(groupPageNo===1),header=showHeader?135:0;
        if(showHeader){
          ctx.fillStyle='#00854a';ctx.fillRect(0,0,W,header);
          const logo=await loadLogo();const logoW=125,logoH=53;ctx.drawImage(logo,m,18,logoW,logoH);
          ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 34px Arial';ctx.fillText(group.title,W/2,55);if(partLabel){ctx.font='700 18px Arial';ctx.fillText('Bản ảnh '+partLabel,W/2,77);}
          ctx.font='400 19px Arial';let sub=[$('bks').value.trim(),$('hoso').value.trim(),formatDateDMY(getDateISO()),$('garage').value.trim()].filter(Boolean).join(' · ');ctx.fillText(sub,W/2,88);
          ctx.font='400 16px Arial';ctx.fillText('TT CH&GĐ MB tại Hải Phòng (093)',W/2,116);
        }
        // Bố cục luôn lấy theo state.per, không lấy theo số ảnh còn lại của trang cuối.
        // 6 ảnh: ngang 3x2, dọc 2x3. 8 ảnh: ngang 4x2, dọc 2x4.
        const layout=layoutDims();
        const cols=layout.cols,rows=layout.rows,gapX=Math.max(4,Math.min(40,Number(state.columnGap)||18)),gapY=Math.max(4,Math.min(40,Number(state.rowGap)||18));
        const areaX=m,areaY=header+22,areaW=W-2*m,areaH=H-header-footer-30;
        const cellW=(areaW-gapX*(cols-1))/cols,cellH=(areaH-gapY*(rows-1))/rows;
        for(let i=0;i<pageItems.length;i++){
          const it=pageItems[i],r=Math.floor(i/cols),col=i%cols,x=areaX+col*(cellW+gapX),y=areaY+r*(cellH+gapY);
          const capH=it.caption?78:28,imgX=x+5,imgY=y+5,imgW=cellW-10,imgH=cellH-capH-10;
          ctx.fillStyle='#f8faf9';ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle='#cbd8d1';ctx.strokeRect(x,y,cellW,cellH);
          const img=await loadImage(it.file);
          drawContainRotated(ctx,img,imgX+imgW/2,imgY+imgH/2,imgW,imgH,it.rotate||0);
          ctx.fillStyle='#00854a';ctx.beginPath();ctx.arc(x+22,y+22,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 15px Arial';ctx.fillText(numberBase+i+1,x+22,y+27);
          ctx.textAlign='center';ctx.fillStyle='#222';ctx.font='400 19px Arial';const lines=wrap(ctx,it.caption,cellW-24,19),lineH=23,startY=y+cellH-capH+22;lines.slice(0,3).forEach((ln,k)=>ctx.fillText(ln,x+cellW/2,startY+k*lineH));ctx.textAlign='left';
        }
        ctx.fillStyle='#777';ctx.font='400 15px Arial';ctx.textAlign='left';ctx.fillText('PTI',m,H-25);ctx.textAlign='center';ctx.fillText(`GĐV: ${getSelectedGdvCache()}`,W/2,H-25);ctx.textAlign='right';ctx.fillText(`${partLabel?'Bản ảnh '+partLabel+' · ':''}Trang ${pageNo} · ${groupPageNo}/${groupPages}`,W-m,H-25);
        return c;
      }
      return {layoutDims,loadImage,loadLogo,wrap,drawContainRotated,drawPage};
    }
  };
})(window);
