(function(global){
  'use strict';
  global.PTI093ImageIngest = {
    install: function(deps){
      const {state,exts,fileBaseName,scheduleAutoDraftSave,render,msg}=deps;
      async function addFiles(files){
        const candidates=[];
        const seenKeys=new Set((state.current.items||[]).map(item=>item.key).filter(Boolean));
        for(const file of files){
          if(!file.type.startsWith('image/')&&!exts.test(file.name))continue;
          const key=file.name+'|'+file.size+'|'+file.lastModified;
          // Deduplicate both against the current section and within this same file-selection batch.
          if(!seenKeys.has(key)){
            seenKeys.add(key);
            candidates.push({file,key,caption:state.filenameCaption?fileBaseName(file.name):'',addSeq:++state.addSeq,rotate:0});
          }
        }
        if(!candidates.length){msg('Không có ảnh mới để thêm.',true);return;}
        state.current.items.push(...candidates);
        render();scheduleAutoDraftSave(true);
        msg(`Đã nhận ${candidates.length} ảnh. Thứ tự giữ nguyên theo thứ tự GĐV thêm ảnh.`,true);
      }
      return {addFiles};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
