(function(global){
  'use strict';
  global.PTI093CaseEditor = {
    install: function(deps){
      const {state,$,fileBaseName,render,scheduleAutoDraftSave,msg}=deps;
      function bindControls(){
        $('title').addEventListener('change',()=>{
          if(state.workspaceOpenPending){$('title').value=state.current.title;msg('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi sửa tiêu đề.',true);return;}
          state.current.title=$('title').value;
          scheduleAutoDraftSave(false);
        });
        $('filenameCaption').addEventListener('change',event=>{
          if(state.workspaceOpenPending){event.target.checked=state.filenameCaption;$('filenameCaption').closest('.filenameCaptionBox').classList.toggle('on',state.filenameCaption);msg('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi đổi thuyết minh ảnh.',true);return;}
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
