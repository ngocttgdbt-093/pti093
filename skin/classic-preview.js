(function(global){
  'use strict';
  global.PTI093ClassicPreviewSkin = {
    install: function(deps){
      const {state,$,document:doc,window:win,buildPreview,getAllGroups,selectedGdv,setSelectedGdvCache,hidePdfWarning,msg,pagePixels,jpegQuality,setTimeout:timer=global.setTimeout}=deps;
      function sameWorkspaceSnapshot(before,after){
        if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)return false;
        for(let i=0;i<before.length;i++){
          const a=before[i],b=after[i];
          if(a!==b||a.title!==b.title||!Array.isArray(a.items)||!Array.isArray(b.items)||a.items.length!==b.items.length)return false;
          for(let j=0;j<a.items.length;j++){
            const x=a.items[j],y=b.items[j];
            if(x!==y||x.caption!==y.caption||x.rotate!==y.rotate||x.key!==y.key||x.file!==y.file)return false;
          }
        }
        return true;
      }
      async function makePreview(){
        if(state.workspaceOpenPending){msg('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi tạo Preview.',true);return}
        setSelectedGdvCache(selectedGdv());
        const groups=getAllGroups();
        if(!groups.length){msg('Chưa có ảnh để Preview.',true);return}
        const previewRevision=state.workspaceRevision;
        const {pages,defs}=await buildPreview(groups,state.per);
        if(state.workspaceOpenPending||state.workspaceRevision!==previewRevision||!sameWorkspaceSnapshot(groups,getAllGroups())){
          msg('Hồ sơ đã thay đổi trong lúc tạo Preview. Kết quả cũ đã bị bỏ; hãy tạo Preview lại.',true);
          return;
        }
        state.pages=pages;
        state.pageDefs=defs;
        $('backEdit').style.display='none';
        $('newCase').style.display='none';
        hidePdfWarning();
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
      function bindControls(){
        $('backEdit').onclick=()=>{
          if(typeof win.pti093ClosePreview==='function')win.pti093ClosePreview();
          doc.body.style.overflow='';
          timer(()=>{
            const drop=$('drop');
            if(drop)win.scrollTo({top:drop.getBoundingClientRect().top+win.scrollY-100,behavior:'smooth'});
            msg('Đã quay lại hồ sơ hiện tại. Anh có thể sửa ảnh, thêm ảnh, sửa thuyết minh hoặc sửa từng nội dung.',true);
          },80);
        };
      }
      bindControls();
      return {makePreview,bindControls};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
