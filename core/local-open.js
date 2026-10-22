(function(global){
  'use strict';
  global.PTI093LocalOpenCore = {
    install: function(deps){
      const {state, $, msg, openLocalDraftDB, setDateInput, render, renderLayout, setDriveState, deviceStorageLabel, setOpenLoad, finishOpenLoad} = deps;
      async function openLocalDraft(id){
        const source=deviceStorageLabel();
        setOpenLoad(source,0,0,'Đang đọc bản lưu ảnh từ '+source+'...');
        setDriveState('Đang tải ảnh từ '+source+'...');
        const db=await openLocalDraftDB();
        let meta,images;
        try{
          [meta,images]=await Promise.all([
            new Promise((resolve,reject)=>{const r=db.transaction('drafts','readonly').objectStore('drafts').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}),
            new Promise((resolve,reject)=>{const tx=db.transaction('draftImages','readonly'),r=tx.objectStore('draftImages').index('draftId').getAll(IDBKeyRange.only(id));r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})
          ]);
        }finally{db.close()}
        if(!meta)throw new Error('Không tìm thấy bản nháp tại máy này.');
        const imageMap=new Map((images||[]).map(x=>[x.sectionIndex+':'+x.itemIndex,x]));
        const groups=[];
        let missing=0;
        const expectedImages=(meta.sections||[]).reduce((n,g)=>n+((g.items||[]).length),0);
        let loadedCount=0;
        setOpenLoad(source,0,expectedImages,expectedImages?'Đang tải ảnh từ '+source+' vào ứng dụng...':'Bản lưu không có ảnh.');
        (meta.sections||[]).forEach((g,si)=>{
          const items=[];
          (g.items||[]).forEach((it,ii)=>{
            const stored=imageMap.get(si+':'+ii);
            if(!stored||!stored.file){missing++;return}
            const f=stored.file instanceof File?stored.file:new File([stored.file],stored.fileName||it.fileName||'image.jpg',{type:stored.type||it.type||'image/jpeg',lastModified:stored.lastModified||it.lastModified||Date.now()});
            loadedCount++;
            setOpenLoad(source,loadedCount,expectedImages,'Đang tải ảnh '+loadedCount+'/'+expectedImages+' từ '+source+'...');
            items.push({file:f,key:it.key||f.name+'|'+f.size+'|'+f.lastModified,caption:it.caption||'',rotate:it.rotate||0,addSeq:it.addSeq||(++state.addSeq),driveFileId:'',driveFileName:'',driveUploadKey:''});
          });
          if(items.length)groups.push({title:g.title||'Bản ảnh chi tiết thiệt hại',items});
        });
        if(!String(id).startsWith('LOCAL-')){
          state.driveRecordId=id;sessionStorage.setItem('pti093_driveRecordId',id);localStorage.setItem('pti093_driveRecordId',id);
        }else{
          state.driveRecordId='';sessionStorage.removeItem('pti093_driveRecordId');localStorage.removeItem('pti093_driveRecordId');
        }
        state.localDraftId=id;
        $('bks').value=meta.bks||'';
        $('hoso').value=meta.caseNumber||'';
        setDateInput(meta.date||'');
        $('garage').value=meta.garage||'';
        const gdv=meta.gdv||'';
        if([...$('gdv').options].some(o=>o.value===gdv))$('gdv').value=gdv;
        else if(gdv){$('gdv').value='Nhập tên khác';$('gdv').dataset.custom=gdv}
        const settings=meta.settings||{};
        if(settings.orientation)state.orientation=settings.orientation;
        if(settings.imagesPerPage){state.per=Number(settings.imagesPerPage);document.querySelectorAll('#counts .opt').forEach(x=>x.classList.toggle('on',Number(x.textContent)===state.per))}
        document.querySelectorAll('#orient .opt').forEach(x=>x.classList.toggle('on',x.dataset.o===state.orientation));
        state.groups=groups.slice(0,-1);state.current=groups[groups.length-1]||{title:'Bản ảnh chi tiết thiệt hại',items:[]};state.editing=-1;
        state.addSeq=0;groups.forEach(g=>g.items.forEach(it=>state.addSeq=Math.max(state.addSeq,it.addSeq||0)));
        $('title').value=state.current.title;
        $('driveId').textContent='💻 Bản lưu tại máy: '+id;$('driveId').classList.remove('hidden');
        finishOpenLoad(source,groups.reduce((n,g)=>n+g.items.length,0));
        setDriveState('✓ Đã tải hoàn tất ảnh từ '+source+' · '+groups.reduce((n,g)=>n+g.items.length,0)+' ảnh.');
        render();renderLayout();
        msg(missing?'Đã mở nháp nhưng thiếu dữ liệu của '+missing+' ảnh trong kho trình duyệt.':'✓ Đã tải hoàn tất ảnh từ '+source+'. Có thể chỉnh sửa, lưu lại hoặc tạo hồ sơ Drive.',true);
        window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'});
      }
      return {openLocalDraft};
    }
  };
})(window);
