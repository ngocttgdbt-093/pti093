(function(global){
  'use strict';
  global.PTILocalSaveCore = {
    install: function(deps){
      const {state, $, snapshotGroupsForProject, openLocalDraftDB, localDraftTransactionDone, getDateISO, selectedGdv, setDriveState, msg, renderLocalSaveFeedback, showLocalSaveConfirm, clearAutoDraft} = deps;
      async function saveLocalDraft(){
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
        const groups=snapshotGroupsForProject();
        const existingLocalId=String(state.localDraftId||'').startsWith('LOCAL-')?state.localDraftId:'';
        const id=existingLocalId||('LOCAL-'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,7).toUpperCase());
        const total=groups.reduce((n,g)=>n+g.items.length,0);
        // Hiện ID ngay từ đầu để người dùng thấy mã hồ sơ trong lúc lưu, kể cả khi lưu chậm.
        const idBox=$('driveId');if(idBox){idBox.textContent='💻 ID hồ sơ local: '+id;idBox.classList.remove('hidden')}renderLocalSaveFeedback(id,3,'Đang chuẩn bị lưu tại máy…','Đang đọc thông tin hồ sơ',false);
        // Chỉ tách bản local khỏi Drive sau khi giao dịch ghi local thành công.
        // Nếu IndexedDB lỗi, giữ nguyên liên kết Drive và ID đang làm việc để người dùng thử lại.
        let db;
        try{
          db=await openLocalDraftDB();
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
          const meta={id,storageType:'local',caseNumber:($('hoso').value||'').trim(),
            bks:($('bks').value||'').trim(),garage:($('garage').value||'').trim(),date:getDateISO(),gdv:selectedGdv(),
            status:'Bản lưu tại máy',settings:{paperSize:'A4',orientation:state.orientation,imagesPerPage:state.per},
            sections,updatedAt:new Date().toISOString()};
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
          // Bản local đã được ghi hoàn tất; từ thời điểm này mới tách trạng thái khỏi Drive.
          for(const g of [...(state.groups||[]),state.current||{}])for(const it of (g.items||[])){
            it.driveFileId='';it.driveFileName='';it.driveUploadKey='';
          }
          state.driveRecordId='';state.localDraftId=id;
          try{sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
          try{localStorage.removeItem('pti093_driveRecordId')}catch(e){}
          $('driveId').textContent='💻 ID hồ sơ local: '+id;
          $('driveId').classList.remove('hidden');
          progress(100,'✓ Đã lưu hồ sơ tại máy thành công',total+' ảnh · ID: '+id+' · Không ghi dữ liệu lên Drive');
          return id;
        }catch(e){
          const box=$('driveProgress');if(box)box.classList.remove('hidden');
          if($('driveProgressText'))$('driveProgressText').textContent='Lưu tại máy thất bại';
          if($('driveProgressPct'))$('driveProgressPct').textContent='!';
          if($('driveProgressBar'))$('driveProgressBar').style.width='100%';
          if($('driveProgressMeta'))$('driveProgressMeta').textContent=e.message||String(e);
          renderLocalSaveFeedback(state.localDraftId||'',null,'Lưu tại máy thất bại',e.message||String(e),true);
          throw e;
        }finally{if(db)db.close()}
      }

      async function saveDraftWithoutPhotos(){
        const n=snapshotGroupsForProject().reduce((sum,g)=>sum+g.items.length,0);
        const ok=await showLocalSaveConfirm(n);
        if(!ok)return;
        const b=$('driveSaveDraft');b.disabled=true;
        const box=$('driveProgress');if(box)box.classList.remove('hidden');
        if($('driveProgressText'))$('driveProgressText').textContent='Đang bắt đầu lưu tại máy…';
        if($('driveProgressPct'))$('driveProgressPct').textContent='0%';
        if($('driveProgressBar'))$('driveProgressBar').style.width='0%';
        if($('driveProgressMeta'))$('driveProgressMeta').textContent='Vui lòng chờ, không đóng tab trong lúc lưu.';
        setDriveState('Đang lưu nháp tại máy…');msg('Đang lưu hồ sơ tại máy… vui lòng chờ.',true);
        try{
          await saveLocalDraft();
          const gdv=$('gdv').value==='Nhập tên khác'?($('gdv').dataset.custom||localStorage.getItem('pti093_gdv_custom')||''):($('gdv').value||'');
          if(gdv){try{localStorage.setItem('pti093_gdv',gdv)}catch(e){}}
          // Chỉ dọn AUTO-DRAFT; giữ ID local để lần lưu sau cập nhật đúng bản local.
          await clearAutoDraft();
        }catch(e){
          setDriveState('Chưa lưu được nháp tại máy: '+e.message,false);
          msg('❌ Lưu tại máy thất bại: '+e.message,true);
        }finally{b.disabled=false}
      }
      function bindControls(){
        const button=$('driveSaveDraft');
        if(button)button.onclick=saveDraftWithoutPhotos;
      }
      return {saveLocalDraft,saveDraftWithoutPhotos,bindControls};
    }
  };
})(window);
