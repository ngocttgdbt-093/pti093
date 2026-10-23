(function(global){
  'use strict';
  global.PTILocalSaveCore = {
    install: function(deps){
      const {state, $, snapshotGroupsForProject, openLocalDraftDB, localDraftTransactionDone, getDateISO, selectedGdv, setDriveState, msg, renderLocalSaveFeedback, showLocalSaveConfirm, clearAutoDraft} = deps;
      async function saveLocalDraft(options={}){
        const ownsWorkspaceLock=options.workspaceLockHeld!==true;
        if(state.workspaceOpenPending&&ownsWorkspaceLock)throw new Error('Đang mở hồ sơ khác hoặc đang lưu hồ sơ tại máy. Hãy chờ thao tác đó hoàn tất trước khi lưu tại máy.');
        const workspaceRevisionAtStart=Number(state.workspaceRevision)||0;
        const workspaceMutationRevisionAtStart=Number(state.workspaceMutationRevision)||0;
        const workspaceChanged=()=>(Number(state.workspaceRevision)||0)!==workspaceRevisionAtStart||(Number(state.workspaceMutationRevision)||0)!==workspaceMutationRevisionAtStart;
        // LƯU LOCAL THUẦN TÚY: ID riêng LOCAL-..., không tạo record hoặc đồng bộ metadata lên Drive.
        const progress=(pct,label,detail='')=>{
          renderLocalSaveFeedback(state.localDraftId||'',pct,label,detail,false);
          const box=$('driveProgress');if(box)box.classList.remove('hidden');
          if($('driveProgressText'))$('driveProgressText').textContent=label;
          if($('driveProgressPct'))$('driveProgressPct').textContent=pct+'%';
          if($('driveProgressBar'))$('driveProgressBar').style.width=pct+'%';
          if($('driveProgressMeta'))$('driveProgressMeta').textContent=detail;
          setDriveState(label);msg(label+(detail?' · '+detail:''),true);
        };
        progress(3,'Đang chuẩn bị lưu tại máy…','Đang đọc thông tin hồ sơ');
        const copiedFromIncompleteDrive=!!(state.driveOpenIncomplete||state.localCopyFromIncompleteDrive);
        const groups=snapshotGroupsForProject();
        // Manual local saves must preserve the current group marker as well as image data.
        // When editing a group whose last image was removed, the shared project snapshot
        // intentionally omits empty groups; reinsert this in-progress group for recovery.
        if(state.current&&Number.isInteger(state.editing)&&state.editing>=0){
          const index=Math.min(state.editing,groups.length);
          if(!groups[index]||groups[index].title!==state.current.title||groups[index].items!==state.current.items){
            if(!state.current.items.length)groups.splice(index,0,{title:state.current.title,items:[],isCurrent:true});
          }
          if(groups[index])groups[index].isCurrent=true;
        }else if(groups.length){
          groups[groups.length-1].isCurrent=true;
        }
        const currentSectionIndex=groups.findIndex(group=>group.isCurrent);
        const existingLocalId=String(state.localDraftId||'').startsWith('LOCAL-')?state.localDraftId:'';
        const id=existingLocalId||('LOCAL-'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,7).toUpperCase());
        const total=groups.reduce((n,g)=>n+g.items.length,0);
        // Hiện ID ngay từ đầu để người dùng thấy mã hồ sơ trong lúc lưu, kể cả khi lưu chậm.
        const idBox=$('driveId');if(idBox){idBox.textContent='💻 ID hồ sơ local: '+id;idBox.classList.remove('hidden')}renderLocalSaveFeedback(id,3,'Đang chuẩn bị lưu tại máy…','Đang đọc thông tin hồ sơ',false);
        // Chỉ tách bản local khỏi Drive sau khi giao dịch ghi local thành công.
        // Nếu IndexedDB lỗi, giữ nguyên liên kết Drive và ID đang làm việc để người dùng thử lại.
        let db;
        if(ownsWorkspaceLock)state.workspaceOpenPending=true;
        try{
          db=await openLocalDraftDB();
          // IndexedDB open yields control: reject a stale snapshot if another case opened meanwhile.
          if(workspaceChanged())throw new Error('Hồ sơ đã thay đổi trong lúc chuẩn bị lưu. Hãy lưu lại trên hồ sơ đang mở.');
          progress(15,'Đang chuẩn bị dữ liệu lưu…',total+' ảnh');
          const sections=groups.map((g,si)=>({
            title:g.title,
            items:g.items.map((it,ii)=>({
              sectionIndex:si,itemIndex:ii,
              fileName:(it.file&&it.file.name)||('anh-'+(ii+1)+'.jpg'),
              type:(it.file&&it.file.type)||'image/jpeg',
              lastModified:(it.file&&it.file.lastModified)||Date.now(),
              size:(it.file&&it.file.size)||0,key:it.key||'',caption:it.caption||'',
              rotate:((it.rotate||0)%360+360)%360,addSeq:it.addSeq||ii+1
            }))
          }));
          const meta={id,storageType:'local',sourceDriveIncomplete:copiedFromIncompleteDrive,caseNumber:($('hoso').value||'').trim(),
            bks:($('bks').value||'').trim(),garage:($('garage').value||'').trim(),date:getDateISO(),gdv:selectedGdv(),
            status:'Bản lưu tại máy',settings:{paperSize:'A4',orientation:state.orientation,imagesPerPage:state.per},
            sections:sections.map((section,index)=>({...section,isCurrent:!!groups[index].isCurrent})),
          editing:currentSectionIndex>=0&&Number.isInteger(state.editing)&&state.editing>=0?currentSectionIndex:-1,
          updatedAt:new Date().toISOString()};
          progress(25,'Đang ghi thông tin hồ sơ…','Chỉ lưu trong trình duyệt trên thiết bị này');
          const tx=db.transaction(['drafts','draftImages'],'readwrite');
          const drafts=tx.objectStore('drafts'),images=tx.objectStore('draftImages');
          drafts.put(meta);
          const idx=images.index('draftId'),cursorReq=idx.openCursor(IDBKeyRange.only(id));
          cursorReq.onsuccess=()=>{
            const cursor=cursorReq.result;
            if(cursor){cursor.delete();cursor.continue();return}
            progress(45,'Đang lưu ảnh vào bộ nhớ trình duyệt…',total+' ảnh');
            sections.forEach((section,si)=>section.items.forEach((item,ii)=>{
              const original=groups[si].items[ii];if(!original||!original.file)return;
              images.put({id:id+'|'+si+'|'+ii,draftId:id,sectionIndex:si,itemIndex:ii,
                file:original.file,fileName:item.fileName,type:item.type,lastModified:item.lastModified});
            }));
          };
          await localDraftTransactionDone(tx);
          // A transition can also begin while the write transaction is pending. The local copy
          // may exist, but never detach Drive/local references from the newly active workspace.
          if(workspaceChanged()){
            const error=new Error('Bản sao đã được ghi tại máy, nhưng hồ sơ đang làm việc đã thay đổi; trạng thái hồ sơ mới được giữ nguyên. Hãy kiểm tra danh sách hồ sơ tại máy.');
            error.code='LOCAL_SAVE_WORKSPACE_CHANGED_AFTER_WRITE';
            throw error;
          }
          // Bản local đã được ghi hoàn tất; từ thời điểm này mới tách trạng thái khỏi Drive.
          for(const g of [...(state.groups||[]),state.current||{}])for(const it of (g.items||[])){
            it.driveFileId='';it.driveFileName='';it.driveUploadKey='';
          }
          state.driveRecordId='';state.localDraftId=id;state.driveOpenIncomplete=false;state.driveOpenPending=false;state.localCopyFromIncompleteDrive=copiedFromIncompleteDrive;
          try{sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
            $('driveId').textContent='💻 ID hồ sơ local: '+id;
          $('driveId').classList.remove('hidden');
          const successLabel=copiedFromIncompleteDrive?'⚠️ Đã lưu bản sao tại máy từ hồ sơ Drive chưa tải đủ ảnh':'✓ Đã lưu hồ sơ tại máy thành công';
          progress(100,successLabel,total+' ảnh · ID: '+id+' · Không ghi dữ liệu lên Drive');
          if(copiedFromIncompleteDrive)setDriveState(successLabel,false);
          return id;
        }catch(e){
          if(e&&e.code==='LOCAL_SAVE_WORKSPACE_CHANGED_AFTER_WRITE'){
            // Restore the visible identity too: the stale save attempt may have shown its old ID.
            const idBox=$('driveId');
            if(idBox){
              if(state.driveRecordId){idBox.textContent='Hồ sơ: '+state.driveRecordId;idBox.classList.remove('hidden')}
              else if(state.localDraftId){idBox.textContent='💻 ID hồ sơ local: '+state.localDraftId;idBox.classList.remove('hidden')}
              else{idBox.classList.add('hidden')}
            }
            if($('driveProgressText'))$('driveProgressText').textContent='Hồ sơ đã thay đổi trong lúc lưu';
            if($('driveProgressPct'))$('driveProgressPct').textContent='!';
            if($('driveProgressMeta'))$('driveProgressMeta').textContent=e.message;
            setDriveState(e.message,false);msg('⚠️ '+e.message,true);
            throw e;
          }
          const idBox=$('driveId');
          if(idBox){
            if(state.driveRecordId){idBox.textContent='Hồ sơ: '+state.driveRecordId;idBox.classList.remove('hidden')}
            else if(state.localDraftId){idBox.textContent='💻 ID hồ sơ local: '+state.localDraftId;idBox.classList.remove('hidden')}
            else{idBox.classList.add('hidden')}
          }
          const box=$('driveProgress');if(box)box.classList.remove('hidden');
          if($('driveProgressText'))$('driveProgressText').textContent='Lưu tại máy thất bại';
          if($('driveProgressPct'))$('driveProgressPct').textContent='!';
          if($('driveProgressBar'))$('driveProgressBar').style.width='100%';
          if($('driveProgressMeta'))$('driveProgressMeta').textContent=e.message||String(e);
          renderLocalSaveFeedback(state.localDraftId||'',null,'Lưu tại máy thất bại',e.message||String(e),true);
          throw e;
        }finally{
          if(db)db.close();
          if(ownsWorkspaceLock)state.workspaceOpenPending=false;
        }
      }

      async function saveDraftWithoutPhotos(){
        if(state.workspaceOpenPending){
          const detail='Đang mở hồ sơ khác. Hãy chờ tải xong trước khi xác nhận lưu tại máy.';
          setDriveState(detail,false);msg(detail,true);return;
        }
        const workspaceRevisionAtStart=Number(state.workspaceRevision)||0;
        const workspaceMutationRevisionAtStart=Number(state.workspaceMutationRevision)||0;
        const n=snapshotGroupsForProject().reduce((sum,g)=>sum+g.items.length,0);
        const ok=await showLocalSaveConfirm(n);
        if(!ok)return;
        if(state.workspaceOpenPending||(Number(state.workspaceRevision)||0)!==workspaceRevisionAtStart||(Number(state.workspaceMutationRevision)||0)!==workspaceMutationRevisionAtStart){
          const detail='Hồ sơ đã thay đổi trong lúc xác nhận lưu. Chưa lưu hồ sơ nào; hãy bấm Lưu tại máy lại trên hồ sơ đang mở.';
          setDriveState(detail,false);msg(detail,true);return;
        }
        const b=$('driveSaveDraft');b.disabled=true;
        const box=$('driveProgress');if(box)box.classList.remove('hidden');
        if($('driveProgressText'))$('driveProgressText').textContent='Đang bắt đầu lưu tại máy…';
        if($('driveProgressPct'))$('driveProgressPct').textContent='0%';
        if($('driveProgressBar'))$('driveProgressBar').style.width='0%';
        if($('driveProgressMeta'))$('driveProgressMeta').textContent='Vui lòng chờ, không đóng tab trong lúc lưu.';
        setDriveState('Đang lưu nháp tại máy…');msg('Đang lưu hồ sơ tại máy… vui lòng chờ.',true);
        // Hold the shared workspace lock through AUTO-DRAFT cleanup. Otherwise a new case
        // could open after the local write but before cleanup and have its recovery draft deleted.
        state.workspaceOpenPending=true;
        try{
          await saveLocalDraft({workspaceLockHeld:true});
          let storedCustomGdv='';
          try{storedCustomGdv=localStorage.getItem('pti093_gdv_custom')||''}catch(e){}
          const gdv=$('gdv').value==='Nhập tên khác'?($('gdv').dataset.custom||storedCustomGdv):($('gdv').value||'');
          if(gdv){try{localStorage.setItem('pti093_gdv',gdv)}catch(e){}}
          // Dọn AUTO-DRAFT là bước hậu xử lý riêng: nếu dọn lỗi, không được báo nhầm bản local vừa ghi là thất bại.
          try{
            await clearAutoDraft();
          }catch(cleanupError){
            const detail=cleanupError&&cleanupError.message?cleanupError.message:String(cleanupError);
            setDriveState('Đã lưu hồ sơ tại máy, nhưng chưa dọn được nháp tự động: '+detail,false);
            msg('⚠️ Hồ sơ đã lưu tại máy thành công. Chưa dọn được nháp tự động; hãy tải lại trang sau khi kiểm tra hồ sơ đã lưu.',true);
          }
        }catch(e){
          if(e&&e.code==='LOCAL_SAVE_WORKSPACE_CHANGED_AFTER_WRITE'){
            // The snapshot write completed, but it must not clear AUTO-DRAFT for the newly opened case.
            return;
          }
          setDriveState('Chưa lưu được nháp tại máy: '+e.message,false);
          msg('❌ Lưu tại máy thất bại: '+e.message,true);
        }finally{state.workspaceOpenPending=false;b.disabled=false}
      }
      function bindControls(){
        const button=$('driveSaveDraft');
        if(button)button.onclick=saveDraftWithoutPhotos;
      }
      return {saveLocalDraft,saveDraftWithoutPhotos,bindControls};
    }
  };
})(window);
