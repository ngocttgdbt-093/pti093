(function(global){
  'use strict';
  global.PTI093DraftRecovery = {
    install: function(deps){
      const {state, $, getDateISO, setDateInput, render, renderLayout, setDriveState, msg, openLocalDraftDB, localDraftTransactionDone, getLocalDrafts} = deps;
      const PTI093_AUTO_DRAFT_ID='AUTO-DRAFT';
      // Mỗi tab có một mã phiên riêng: F5 giữ nguyên sessionStorage, tab mới sẽ tạo phiên mới.
      const PTI093_SESSION_KEY='pti093_work_session_id';
      let PTI093_SESSION_ID=sessionStorage.getItem(PTI093_SESSION_KEY)||'';
      if(!PTI093_SESSION_ID){PTI093_SESSION_ID=(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));sessionStorage.setItem(PTI093_SESSION_KEY,PTI093_SESSION_ID);}
      let autoDraftTimer=null,autoDraftSaving=false,autoDraftAgain=false,autoDraftImagesDirty=true,autoDraftRestoring=false,autoDraftImageRevision=0,autoDraftResetting=false;
      function clearAutoDraftTimer(){clearTimeout(autoDraftTimer)}
      /* Storage adapter supplied by core/local-draft-store.js */
      
      /* Storage adapter supplied by core/local-draft-store.js */
      
      /* Storage adapter supplied by core/local-draft-store.js */
      
      function scheduleAutoDraftSave(imagesDirty=true){
        if(autoDraftRestoring||autoDraftResetting)return;
        if(imagesDirty){autoDraftImagesDirty=true;autoDraftImageRevision++}
        clearTimeout(autoDraftTimer);
        autoDraftTimer=setTimeout(()=>saveAutoDraft().catch(e=>console.warn('Không tự lưu được bản nháp PTI093:',e)),300);
      }
      
      async function saveAutoDraft(){
        if(autoDraftRestoring||autoDraftResetting)return;
        if(autoDraftSaving){autoDraftAgain=true;return}
        autoDraftSaving=true;
        const imagesNeedSaving=autoDraftImagesDirty,imageRevision=autoDraftImageRevision;
        try{
          const groups=[...state.groups.map(g=>({title:g.title,items:(g.items||[]).slice(),isCurrent:false})),...((state.current&&state.current.items&&state.current.items.length)?[{title:state.current.title,items:state.current.items.slice(),isCurrent:true}]:[])];
          const gdv=$('gdv').value==='Nhập tên khác'?($('gdv').dataset.custom||''):$('gdv').value;
          const sections=groups.map((g,si)=>({title:g.title,isCurrent:!!g.isCurrent,items:g.items.map((it,ii)=>({
            sectionIndex:si,itemIndex:ii,fileName:(it.file&&it.file.name)||it.driveFileName||('anh-'+(ii+1)+'.jpg'),
            type:(it.file&&it.file.type)||'image/jpeg',lastModified:(it.file&&it.file.lastModified)||Date.now(),
            size:(it.file&&it.file.size)||0,key:it.key||'',caption:it.caption||'',
            rotate:((it.rotate||0)%360+360)%360,addSeq:it.addSeq||ii+1,
            driveFileId:it.driveFileId||'',driveFileName:it.driveFileName||'',driveUploadKey:it.driveUploadKey||''
          }))}));
          const meta={id:PTI093_AUTO_DRAFT_ID,auto:true,sessionId:PTI093_SESSION_ID,caseNumber:($('hoso').value||'').trim(),bks:($('bks').value||'').trim(),garage:($('garage').value||'').trim(),
            gdv,date:getDateISO(),status:'Tự động lưu trên máy',driveRecordId:state.driveRecordId||'',
            localDraftId:state.localDraftId||'',settings:{orientation:state.orientation,imagesPerPage:state.per},
            currentTitle:$('title').value||state.current.title||'Bản ảnh chi tiết thiệt hại',sections,updatedAt:new Date().toISOString()};
          const db=await openLocalDraftDB();
          try{
            const tx=db.transaction(imagesNeedSaving?['drafts','draftImages']:['drafts'],'readwrite');
            tx.objectStore('drafts').put(meta);
            if(imagesNeedSaving){
              const idx=tx.objectStore('draftImages').index('draftId');
              const cursorReq=idx.openCursor(IDBKeyRange.only(PTI093_AUTO_DRAFT_ID));
              cursorReq.onsuccess=()=>{
                const cursor=cursorReq.result;
                if(cursor){cursor.delete();cursor.continue();return}
                sections.forEach((section,si)=>section.items.forEach((item,ii)=>{
                  const original=groups[si]&&groups[si].items[ii];
                  if(original&&original.file)tx.objectStore('draftImages').put({
                    id:PTI093_AUTO_DRAFT_ID+'|'+si+'|'+ii,draftId:PTI093_AUTO_DRAFT_ID,
                    sectionIndex:si,itemIndex:ii,file:original.file,fileName:item.fileName,
                    type:item.type,lastModified:item.lastModified
                  });
                }));
              };
            }
            await localDraftTransactionDone(tx);
            if(autoDraftImageRevision===imageRevision)autoDraftImagesDirty=false;
          }finally{db.close()}
        }finally{
          autoDraftSaving=false;
          if(autoDraftAgain){autoDraftAgain=false;scheduleAutoDraftSave(false)}
        }
      }
      
      async function finalizeCompletedSession(){
        const gdv=$('gdv').value==='Nhập tên khác'
          ? ($('gdv').dataset.custom||localStorage.getItem('pti093_gdv_custom')||'')
          : ($('gdv').value||'');
        if(gdv){
          try{localStorage.setItem('pti093_gdv',gdv)}catch(e){}
        }
        try{
          await clearAutoDraft();
          // Xóa định danh phiên hiện tại khỏi bộ nhớ phiên; hồ sơ thật trên Drive/Local
          // vẫn giữ nguyên và có thể tìm/mở lại từ chức năng Tìm hồ sơ.
          state.localDraftId='';
        }catch(e){
          console.warn('Không thể dọn bản nháp sau khi hoàn tất:',e);
        }
      }
      
      async function clearAutoDraft(){
        autoDraftResetting=true;clearTimeout(autoDraftTimer);
        while(autoDraftSaving)await new Promise(resolve=>setTimeout(resolve,50));
        const db=await openLocalDraftDB();
        try{
          const tx=db.transaction(['drafts','draftImages'],'readwrite');
          tx.objectStore('drafts').delete(PTI093_AUTO_DRAFT_ID);
          const idx=tx.objectStore('draftImages').index('draftId'),req=idx.openCursor(IDBKeyRange.only(PTI093_AUTO_DRAFT_ID));
          req.onsuccess=()=>{const cur=req.result;if(cur){cur.delete();cur.continue()}};
          await localDraftTransactionDone(tx);
        }finally{db.close()}
        autoDraftImagesDirty=true;autoDraftResetting=false;
      }
      
      async function restoreAutoDraft(){
        autoDraftRestoring=true;
        try{
          const db=await openLocalDraftDB();
          let meta,images=[];
          try{
            [meta,images]=await Promise.all([
              new Promise((resolve,reject)=>{const q=db.transaction('drafts','readonly').objectStore('drafts').get(PTI093_AUTO_DRAFT_ID);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)}),
              new Promise((resolve,reject)=>{const tx=db.transaction('draftImages','readonly'),q=tx.objectStore('draftImages').index('draftId').getAll(IDBKeyRange.only(PTI093_AUTO_DRAFT_ID));q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error)})
            ]);
          }finally{db.close()}
          if(!meta)return;
          // Chỉ khôi phục nháp trong đúng phiên/tab. Nháp của phiên trước bị dọn, không hiển thị lại.
          if(!meta.sessionId||meta.sessionId!==PTI093_SESSION_ID){
            await clearAutoDraft();
            state.groups=[];state.current={title:'Bản ảnh chi tiết thiệt hại',items:[]};state.editing=-1;
            state.driveRecordId='';state.localDraftId='';state.pages=[];state.pageDefs=[];
            sessionStorage.removeItem('pti093_driveRecordId');
            $('bks').value='';$('hoso').value='';setDateInput('');$('garage').value='';
            $('title').value=state.current.title;render();renderLayout();
            setDriveState('Phiên mới — chưa có ảnh hoặc thông tin hồ sơ cũ.');
            return;
          }
          const imageMap=new Map(images.map(x=>[x.sectionIndex+':'+x.itemIndex,x]));
          const groups=[];let missing=0;
          (meta.sections||[]).forEach((g,si)=>{
            const items=[];
            (g.items||[]).forEach((it,ii)=>{
              const stored=imageMap.get(si+':'+ii);
              if(!stored||!stored.file){missing++;return}
              const f=stored.file instanceof File?stored.file:new File([stored.file],stored.fileName||it.fileName||'image.jpg',{type:stored.type||it.type||'image/jpeg',lastModified:stored.lastModified||it.lastModified||Date.now()});
              items.push({file:f,key:it.key||f.name+'|'+f.size+'|'+f.lastModified,caption:it.caption||'',rotate:it.rotate||0,addSeq:it.addSeq||(++state.addSeq),driveFileId:it.driveFileId||'',driveFileName:it.driveFileName||'',driveUploadKey:it.driveUploadKey||''});
            });
            if(items.length)groups.push({title:g.title||'Bản ảnh chi tiết thiệt hại',items,isCurrent:!!g.isCurrent});
          });
          $('bks').value=meta.bks||'';$('hoso').value=meta.caseNumber||'';setDateInput(meta.date||'');$('garage').value=meta.garage||'';
          const gdv=meta.gdv||'';
          if([...$('gdv').options].some(o=>o.value===gdv))$('gdv').value=gdv;
          else if(gdv){$('gdv').value='Nhập tên khác';$('gdv').dataset.custom=gdv}
          const currentGroup=groups.find(g=>g.isCurrent);
          const restoredGroups=groups.filter(g=>!g.isCurrent);
          const restoredImageCount=groups.reduce((n,g)=>n+(g.items||[]).length,0);
          // Mặc định thống nhất của ứng dụng: 6 ảnh/trang, A4 dọc.
          // Chỉ khôi phục bố cục cũ khi bản nháp thực sự có ảnh đang làm việc.
          const hasActiveWork=restoredImageCount>0;
          if(hasActiveWork){
            const settings=meta.settings||{};
            if(settings.orientation==='landscape'||settings.orientation==='portrait')state.orientation=settings.orientation;
            if([1,2,3,4,6,8].includes(Number(settings.imagesPerPage)))state.per=Number(settings.imagesPerPage);
          }else{
            state.per=6;
            state.orientation='portrait';
          }
          document.querySelectorAll('#counts .opt').forEach(x=>x.classList.toggle('on',Number(x.textContent)===state.per));
          document.querySelectorAll('#orient .opt').forEach(x=>x.classList.toggle('on',x.dataset.o===state.orientation));
          state.groups=restoredGroups;
          state.current=currentGroup||{title:meta.currentTitle||'Bản ảnh chi tiết thiệt hại',items:[]};
          state.editing=-1;state.localDraftId=meta.localDraftId||'';state.driveRecordId=meta.driveRecordId||'';
          state.addSeq=0;groups.forEach(g=>g.items.forEach(it=>state.addSeq=Math.max(state.addSeq,it.addSeq||0)));
          if(state.driveRecordId){sessionStorage.setItem('pti093_driveRecordId',state.driveRecordId);localStorage.setItem('pti093_driveRecordId',state.driveRecordId)}
          $('title').value=state.current.title||meta.currentTitle||'Bản ảnh chi tiết thiệt hại';
          if(state.driveRecordId){$('driveId').textContent='Hồ sơ: '+state.driveRecordId;$('driveId').classList.remove('hidden')}
          render();renderLayout();autoDraftImagesDirty=false;
          if(groups.length||meta.bks||meta.caseNumber)setDriveState('Đã khôi phục bản nháp tự động · '+groups.reduce((n,g)=>n+g.items.length,0)+' ảnh.');
          msg(missing?'Đã khôi phục bản nháp nhưng thiếu '+missing+' ảnh trong bộ nhớ trình duyệt.':'Đã khôi phục công việc đang làm. Anh có thể tiếp tục ngay.',true);
        }catch(e){console.warn('Không thể khôi phục bản nháp tự động:',e);msg('Chưa đọc được bản nháp tự động từ bộ nhớ trình duyệt.',true)}
        finally{autoDraftRestoring=false}
      }
      return {scheduleAutoDraftSave,saveAutoDraft,finalizeCompletedSession,clearAutoDraft,restoreAutoDraft,clearAutoDraftTimer};
    }
  };
})(window);
