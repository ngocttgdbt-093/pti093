(function(global){
  'use strict';
  global.PTI093ClassicPreviewSkin = {
    install: function(deps){
      const {state,$,document:doc,window:win,buildPreview,getAllGroups,selectedGdv,setSelectedGdvCache,hidePdfWarning,msg,pagePixels,jpegQuality}=deps;
      async function makePreview(){
        setSelectedGdvCache(selectedGdv());
        $('backEdit').style.display='none';
        $('newCase').style.display='none';
        hidePdfWarning();
        const groups=getAllGroups();
        if(!groups.length){msg('Chưa có ảnh để Preview.',true);return}
        const {pages,defs}=await buildPreview(groups,state.per);
        state.pages=pages;
        state.pageDefs=defs;
        $('preview').innerHTML='';
        pages.forEach((canvas,i)=>{
          const div=doc.createElement('div');div.className='pageprev';
          const label=doc.createElement('div');label.className='muted';label.textContent='Trang '+(i+1);
          div.append(label,canvas);
          $('preview').appendChild(div);
        });
        $('previewInfo').textContent='Preview '+pages.length+' trang A4 · '+groups.length+' nội dung · '+groups.reduce((sum,group)=>sum+group.items.length,0)+' ảnh · tối ưu '+pagePixels().dpi+' DPI / JPEG '+Math.round(jpegQuality()*100)+'%';
        $('pdf').disabled=false;
        $('newCase').style.display='inline-block';
        win.scrollTo({top:$('preview').getBoundingClientRect().top+win.scrollY-80,behavior:'smooth'});
      }
      return {makePreview};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
