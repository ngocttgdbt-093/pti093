(function(global){
  'use strict';
  global.PTI093LocalOpenCore = {
    install: function(deps){
      const {state, $, msg, openLocalDraftDB, setDateInput, render, renderLayout, setDriveState, deviceStorageLabel, setOpenLoad, finishOpenLoad, scheduleAutoDraftSave, fileKey:makeFileKey} = deps;
      const fileKey=makeFileKey||function(file){
        const base=[file.name||'',file.size||0,file.lastModified||0].join('|');
        const relative=String(file.webkitRelativePath||'').trim();
        return relative?base+'|'+relative:base;
      };
      async function openLocalDraftUnlocked(id){
        const source=deviceStorageLabel();
        setOpenLoad(source,0,0,'Đang đọc bản lưu ảnh từ '+source+'...');
        setDriveState('Đang tải ảnh từ '+source+'...');
        let db,meta,images;
        try{
          db=await openLocalDraftDB();
          [meta,images]=await Promise.all([
            new Promise((resolve,reject)=>{const r=db.transaction('drafts','readonly').objectStore('drafts').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}),
            new Promise((resolve,reject)=>{const tx=db.transaction('draftImages','readonly'),r=tx.objectStore('draftImages').index('draftId').getAll(IDBKeyRange.only(id));r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})
          ]);
        }catch(error){
          const detail='Không thể đọc bản lưu tại máy: '+(error&&error.message?error.message:String(error));
          setOpenLoad(source,0,0,detail);
          setDriveState(detail,false);
          throw error;
        }finally{if(db)db.close()}
        if(!meta){
          const detail='Không tìm thấy bản lưu tại máy này.';
          setOpenLoad(source,0,0,detail);
          setDriveState(detail,false);
          throw new Error('Không tìm thấy bản nháp tại máy này.');
        }
        const imageMap=new Map((images||[]).map(x=>[x.sectionIndex+':'+x.itemIndex,x]));
        const groups=[];
        let missing=0;
        let nextAddSeq=state.addSeq||0;
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
            items.push({file:f,key:it.key||fileKey(f),caption:it.caption||'',rotate:it.rotate||0,addSeq:it.addSeq||(++nextAddSeq),driveFileId:'',driveFileName:'',driveUploadKey:''});
          });
          if(items.length)groups.push({title:g.title||'Bản ảnh chi tiết thiệt hại',items});
        });
        if(missing>0){
          const detail='Không thể mở đầy đủ bản lưu: thiếu dữ liệu của '+missing+'/'+expectedImages+' ảnh. Hồ sơ đang mở được giữ nguyên.';
          setOpenLoad(source,loadedCount,expectedImages,detail);
          setDriveState(detail,false);
          throw new Error(detail);
        }
        if(!String(id).startsWith('LOCAL-')){
          state.driveRecordId=id;
          try{global.sessionStorage.setItem('pti093_driveRecordId',id)}catch(e){}
          try{global.localStorage.setItem('pti093_driveRecordId',id)}catch(e){}
        }else{
          state.driveRecordId='';
          try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
          try{global.localStorage.removeItem('pti093_driveRecordId')}catch(e){}
        }
        state.localDraftId=id;state.driveOpenIncomplete=false;state.driveOpenPending=false;
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
        // Replace any older AUTO-DRAFT with the case just opened; otherwise an immediate
        // F5 could restore a different case from the same browser session.
        if(scheduleAutoDraftSave)scheduleAutoDraftSave(true);
        msg(missing?'Đã mở nháp nhưng thiếu dữ liệu của '+missing+' ảnh trong kho trình duyệt.':'✓ Đã tải hoàn tất ảnh từ '+source+'. Có thể chỉnh sửa, lưu lại hoặc tạo hồ sơ Drive.',true);
        window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'});
      }
      async function openLocalDraft(id){
        if(state.workspaceOpenPending)throw new Error('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi mở hồ sơ tiếp theo.');
        state.workspaceOpenPending=true;
        try{return await openLocalDraftUnlocked(id)}
        finally{state.driveOpenPending=false;state.workspaceOpenPending=false}
      }
      return {openLocalDraft};
    }
  };
})(window);
