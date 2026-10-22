(function(global){
  'use strict';
  global.PTI093ImageEditing = {
    install: function(deps){
      const {state,$,exts,fileBaseName,render,scheduleAutoDraftSave,msg,confirm}=deps;
      function beginReplace(index){state.replaceIndex=index;$('replaceFile').click();}
      function beginInsert(index){state.insertIndex=index;$('insertFile').click();}
      function rotate(item,index){item.rotate=(item.rotate+90)%360;render();scheduleAutoDraftSave(true);msg('Ảnh số '+(index+1)+' đã xoay '+item.rotate+'°.',true);}
      function deleteCurrent(index){state.current.items.splice(index,1);render();scheduleAutoDraftSave(true);}
      function captionChange(item,value){item.caption=value;scheduleAutoDraftSave(false);}
      function handleInsertChange(event){
        const input=event.target,files=[...input.files],index=state.insertIndex;
        input.value='';state.insertIndex=-1;
        if(index<0||index>=state.current.items.length||!files.length)return;
        const candidates=[];
        for(const file of files){
          if(!file.type.startsWith('image/')&&!exts.test(file.name))continue;
          const key=file.name+'|'+file.size+'|'+file.lastModified;
          if(state.current.items.some(item=>item.key===key)||candidates.some(item=>item.key===key))continue;
          candidates.push({file,key,caption:state.filenameCaption?fileBaseName(file.name):'',addSeq:++state.addSeq,rotate:0});
        }
        if(!candidates.length){msg('Không có ảnh mới để chèn.',true);return;}
        state.current.items.splice(index+1,0,...candidates);
        render();scheduleAutoDraftSave(true);
        msg('Đã chèn '+candidates.length+' ảnh sau ảnh số '+(index+1)+'.',true);
      }
      function handleReplaceChange(event){
        const input=event.target,file=input.files[0],index=state.replaceIndex;
        input.value='';state.replaceIndex=-1;
        if(!file||index<0||index>=state.current.items.length)return;
        if(!file.type.startsWith('image/')&&!exts.test(file.name))return;
        const old=state.current.items[index],key=file.name+'|'+file.size+'|'+file.lastModified;
        if(state.current.items.some((item,i)=>i!==index&&item.key===key)){
          msg('Ảnh này đã có trong mục hiện tại.',true);return;
        }
        state.current.items[index]={...old,file,key,caption:state.filenameCaption?fileBaseName(file.name):old.caption};
        render();scheduleAutoDraftSave(true);
        msg('Đã thay ảnh số '+(index+1)+'; vị trí và phần thuyết minh được giữ nguyên.',true);
      }
      function clearCurrent(){
        if(!state.current.items.length)return;
        if(!confirm('Xóa toàn bộ ảnh của nội dung đang làm?'))return;
        state.current.items=[];render();scheduleAutoDraftSave(true);
        msg('Đã xóa ảnh của nội dung hiện tại.',true);
      }
      $('clear').onclick=clearCurrent;
      $('insertFile').addEventListener('change',handleInsertChange);
      $('replaceFile').addEventListener('change',handleReplaceChange);
      return {beginReplace,beginInsert,rotate,deleteCurrent,captionChange,handleInsertChange,handleReplaceChange,clearCurrent};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
