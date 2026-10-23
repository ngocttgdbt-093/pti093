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
        // All metadata and image blobs are validated above. From this point the active
        // workspace begins changing, so invalidate any PDF/autosave snapshot before mutation.
        state.workspaceRevision=(Number(state.workspaceRevision)||0)+1;
        if(!String(id).startsWith('LOCAL-')){
          state.driveRecordId=id;
          try{global.sessionStorage.setItem('pti093_driveRecordId',id)}catch(e){}
        }else{
          state.driveRecordId='';
          try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
        }
        state.localDraftId=id;state.driveOpenIncomplete=false;state.driveOpenPending=false;state.localCopyFromIncompleteDrive=!!meta.sourceDriveIncomplete;
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
        if(state.localCopyFromIncompleteDrive){
          const detail='⚠️ Bản lưu tại máy này được tạo từ hồ sơ Drive chưa tải đủ ảnh. Hãy kiểm tra số ảnh trước khi tạo hồ sơ Drive mới.';
          setDriveState(detail,false);
        }else{
          setDriveState('✓ Đã tải hoàn tất ảnh từ '+source+' · '+groups.reduce((n,g)=>n+g.items.length,0)+' ảnh.');
        }
        render();renderLayout();
        if(state.localCopyFromIncompleteDrive)msg('⚠️ Bản lưu tại máy này được tạo từ hồ sơ Drive chưa tải đủ ảnh. Hãy kiểm tra số ảnh trước khi tạo hồ sơ Drive mới.',true);
        else msg(missing?'Đã mở nháp nhưng thiếu dữ liệu của '+missing+' ảnh trong kho trình duyệt.':'✓ Đã tải hoàn tất ảnh từ '+source+'. Có thể chỉnh sửa, lưu lại hoặc tạo hồ sơ Drive.',true);
        window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'});
      }
      function snapshotLocalOpenWorkspace(){
        const stateSnapshot={...state};
        const fields={};
        for(const id of ['bks','hoso','date','gdv','garage','title','driveId']){
          const el=$(id);if(!el)continue;
          fields[id]={value:el.value,textContent:el.textContent,innerHTML:el.innerHTML,
            dataset:el.dataset?{...el.dataset}:null,
            className:typeof el.className==='string'?el.className:null,hidden:el.hidden};
        }
        let storedRecordId='';
        try{storedRecordId=global.sessionStorage.getItem('pti093_driveRecordId')||''}catch(e){}
        return {stateSnapshot,fields,storedRecordId};
      }
      function restoreLocalOpenWorkspace(snapshot){
        const revision=state.workspaceRevision;
        for(const key of Object.keys(state))if(!Object.prototype.hasOwnProperty.call(snapshot.stateSnapshot,key))delete state[key];
        Object.assign(state,snapshot.stateSnapshot);
        state.workspaceRevision=revision;
        state.workspaceOpenPending=false;state.driveOpenPending=false;
        for(const [id,saved] of Object.entries(snapshot.fields)){
          const el=$(id);if(!el)continue;
          if('value'in saved)el.value=saved.value;
          if('textContent'in saved)el.textContent=saved.textContent;
          if('innerHTML'in saved)el.innerHTML=saved.innerHTML;
          if(saved.dataset&&el.dataset){for(const key of Object.keys(el.dataset))delete el.dataset[key];Object.assign(el.dataset,saved.dataset)}
          if(saved.className!==null)el.className=saved.className;
          if('hidden'in saved)el.hidden=saved.hidden;
        }
        try{
          if(snapshot.storedRecordId)global.sessionStorage.setItem('pti093_driveRecordId',snapshot.storedRecordId);
          else global.sessionStorage.removeItem('pti093_driveRecordId');
        }catch(e){}
        try{
          document.querySelectorAll('#counts .opt').forEach(x=>x.classList.toggle('on',Number(x.textContent)===state.per));
          document.querySelectorAll('#orient .opt').forEach(x=>x.classList.toggle('on',x.dataset.o===state.orientation));
        }catch(e){}
        try{render();renderLayout()}catch(e){}
      }
      async function openLocalDraft(id){
        if(state.workspaceOpenPending)throw new Error('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi mở hồ sơ tiếp theo.');
        const snapshot=snapshotLocalOpenWorkspace();
        state.workspaceOpenPending=true;
        try{
          const result=await openLocalDraftUnlocked(id);
          state.driveOpenPending=false;state.workspaceOpenPending=false;
          if(scheduleAutoDraftSave)scheduleAutoDraftSave(true);
          return result;
        }catch(error){
          const mutated=(Number(state.workspaceRevision)||0)!==(Number(snapshot.stateSnapshot.workspaceRevision)||0);
          restoreLocalOpenWorkspace(snapshot);
          if(mutated){
            const detail='Không thể hoàn tất mở bản lưu tại máy: '+(error&&error.message?error.message:String(error))+'. Hồ sơ đang làm việc trước đó đã được khôi phục.';
            setDriveState(detail,false);msg(detail,true);
            if(scheduleAutoDraftSave)scheduleAutoDraftSave(true);
          }
          throw error;
        }finally{state.driveOpenPending=false;state.workspaceOpenPending=false}
      }
      return {openLocalDraft};
    }
  };
})(window);
