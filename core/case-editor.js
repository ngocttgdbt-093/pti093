(function(global){
  'use strict';
  global.PTI093CaseEditor = {
    install: function(deps){
      const {state,$,fileBaseName,render,scheduleAutoDraftSave,msg}=deps;
      function bindControls(){
        $('title').addEventListener('change',()=>{
          state.current.title=$('title').value;
          scheduleAutoDraftSave(false);
        });
        $('filenameCaption').addEventListener('change',event=>{
          state.filenameCaption=event.target.checked;
          $('filenameCaption').closest('.filenameCaptionBox').classList.toggle('on',state.filenameCaption);
          if(state.filenameCaption){
            state.current.items.forEach(item=>{item.caption=fileBaseName(item.file.name);});
            render();
            scheduleAutoDraftSave(false);
            msg('Đã lấy tên file (bỏ phần đuôi) làm thuyết minh cho các ảnh trong mục này.',true);
          }else{
            msg('Đã tắt chế độ lấy tên file; ảnh mới sẽ quay về cách thuyết minh bình thường.',true);
          }
        });
      }
      return {bindControls};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
