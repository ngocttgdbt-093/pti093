(function(global){
  'use strict';
  global.PTI093GroupWorkflow = {
    install: function(deps){
      const {state,$,workspaceCore,render,makePreview,scheduleAutoDraftSave,msg,confirm,window}=deps;
      function editGroup(index){
        if(state.current.items.length&&!confirm('Mục hiện tại chưa lưu. Bỏ mục hiện tại để sửa mục đã lưu?'))return;
        if(!workspaceCore.beginEditGroup(state,index))return;
        $('filenameCaption').checked=false;
        $('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');
        $('preview').innerHTML='';
        $('previewInfo').textContent='Preview cũ đã được hủy vì hồ sơ đang được chỉnh sửa.';
        scheduleAutoDraftSave(true);
        $('pdf').disabled=true;
        $('backEdit').style.display='none';
        $('newCase').style.display='none';
        $('title').value=state.current.title;
        render();
        window.scrollTo({top:$('drop').getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});
      }
      function commitCurrent(){return workspaceCore.commitCurrent(state)}
      function saveNext(){
        state.current.title=$('title').value;
        const group=commitCurrent();
        if(!group)return;
        state.current={title:$('title').value,items:[]};
        state.filenameCaption=false;
        $('filenameCaption').checked=false;
        $('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');
        render();scheduleAutoDraftSave(true);
        msg('Đã lưu “'+group.title+'”. Hãy chọn nội dung tiếp theo.',true);
        window.scrollTo({top:$('drop').getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});
      }
      function finish(){
        state.current.title=$('title').value;
        if(state.current.items.length)commitCurrent();
        $('title').value=state.current.title;
        state.current={title:'Bản ảnh chi tiết thiệt hại',items:[]};
        state.filenameCaption=false;
        $('filenameCaption').checked=false;
        $('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');
        render();scheduleAutoDraftSave(true);
        makePreview();
      }
      $('saveNext').onclick=saveNext;
      $('finish').onclick=finish;
      return {editGroup,commitCurrent,saveNext,finish};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
