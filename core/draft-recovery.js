(function(global){
  'use strict';
  global.PTI093DraftRecovery = {
    install: function(deps){
      const {state, $, getDateISO, setDateInput, render, renderLayout, setDriveState, msg, openLocalDraftDB, localDraftTransactionDone, fileKey:makeFileKey} = deps;
      const fileKey=makeFileKey||function(file){
        const base=[file.name||'',file.size||0,file.lastModified||0].join('|');
        const relative=String(file.webkitRelativePath||'').trim();
        return relative?base+'|'+relative:base;
      };
      const PTI093_AUTO_DRAFT_ID='AUTO-DRAFT';
      // Mỗi tab có một mã phiên riêng: F5 giữ nguyên sessionStorage, tab mới sẽ tạo phiên mới.
      const PTI093_SESSION_KEY='pti093_work_session_id';
      let PTI093_SESSION_ID='';
      // Storage có thể bị chặn trong chế độ riêng tư/chính sách trình duyệt; không để lỗi này chặn khởi động Core.
      try{PTI093_SESSION_ID=global.sessionStorage.getItem(PTI093_SESSION_KEY)||''}catch(e){}
      if(!PTI093_SESSION_ID){
        PTI093_SESSION_ID=(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));
        try{global.sessionStorage.setItem(PTI093_SESSION_KEY,PTI093_SESSION_ID)}catch(e){}
      }
      // IndexedDB is shared across tabs: isolate new sessions while retaining legacy-key recovery.
      let activeAutoDraftId=PTI093_AUTO_DRAFT_ID+'-'+PTI093_SESSION_ID;
      let autoDraftTimer=null,autoDraftSaving=false,autoDraftAgain=false,autoDraftImagesDirty=true,autoDraftRestoring=false,autoDraftUserChangedDuringRestore=false,autoDraftImageRevision=0,autoDraftResetting=false;
      function clearAutoDraftTimer(){clearTimeout(autoDraftTimer)}
/* Storage adapter supplied by core/local-draft-store.js */
      
function scheduleAutoDraftSave(imagesDirty=true,internalReschedule=false){
        if(autoDraftResetting)return;
        // Track content changes independently from open/close transitions so PDF export
        // can detect edits even when the existing Preview arrays keep the same identity.
        if(!internalReschedule)state.workspaceMutationRevision=(Number(state.workspaceMutationRevision)||0)+1;
        if(autoDraftRestoring){autoDraftUserChangedDuringRestore=true;return}
        if(imagesDirty){autoDraftImagesDirty=true;autoDraftImageRevision++}
        clearTimeout(autoDraftTimer);
        autoDraftTimer=setTimeout(()=>saveAutoDraft().catch(e=>console.warn('Không tự lưu được bản nháp PTI093:',e)),300);
      }
      
      async function saveAutoDraft(){
        if(state.workspaceOpenPending)return;
        const workspaceRevisionAtStart=Number(state.workspaceRevision)||0;
        if(autoDraftRestoring){autoDraftUserChangedDuringRestore=true;return}
        if(autoDraftResetting)return;
        if(autoDraftSaving){autoDraftAgain=true;return}
        autoDraftSaving=true;
        const imagesNeedSaving=autoDraftImagesDirty,imageRevision=autoDraftImageRevision;
        try{
          const groups=[...state.groups.map(g=>({title:g.title,items:(g.items||[]).slice(),isCurrent:false})),...((state.current&&state.current.items&&state.current.items.length)?[{title:state.current.title,items:state.current.items.slice(),isCurrent:true}]:[])];
          const gdv=$('gdv').value==='Nhập tên khác'?($('gdv').dataset.custom||''):$('gdv').value;
          const sections=groups.map((g,si)=>({title:g.title,isCurrent:!!g.isCurrent,items:g.items.map((it,ii)=>({
            sectionIndex:si,itemIndex:ii,fileName:(it.file&&it.file.name)||it.driveFileName||('anh-'+(ii+1)+'.jpg'),
            type:(it.file&&it.file.type)||'image/jpeg',lastModified:(it.file&&it.file.lastModified)||Date.now(),
            size:(it.file&&it.file.size)||0,key:it.key||(it.file?fileKey(it.file):''),caption:it.caption||'',
            rotate:((it.rotate||0)%360+360)%360,addSeq:it.addSeq||ii+1,
            driveFileId:it.driveFileId||'',driveFileName:it.driveFileName||'',driveUploadKey:it.driveUploadKey||''
          }))}));
          const draftId=activeAutoDraftId;
          const meta={id:draftId,auto:true,sessionId:PTI093_SESSION_ID,caseNumber:($('hoso').value||'').trim(),bks:($('bks').value||'').trim(),garage:($('garage').value||'').trim(),
            gdv,date:getDateISO(),status:'Tự động lưu trên máy',driveRecordId:state.driveRecordId||'',driveOpenIncomplete:!!state.driveOpenIncomplete,localCopyFromIncompleteDrive:!!state.localCopyFromIncompleteDrive,
            localDraftId:state.localDraftId||'',settings:{orientation:state.orientation,imagesPerPage:state.per},
            currentTitle:$('title').value||state.current.title||'Bản ảnh chi tiết thiệt hại',sections,updatedAt:new Date().toISOString()};
          const db=await openLocalDraftDB();
          try{
            // IndexedDB open yields control. Another workspace may open and finish while
            // this autosave waits, so reject snapshots captured from an older revision.
            if(state.workspaceOpenPending||(Number(state.workspaceRevision)||0)!==workspaceRevisionAtStart)return;
            const tx=db.transaction(imagesNeedSaving?['drafts','draftImages']:['drafts'],'readwrite');
            tx.objectStore('drafts').put(meta);
            if(imagesNeedSaving){
              const idx=tx.objectStore('draftImages').index('draftId');
              const cursorReq=idx.openCursor(IDBKeyRange.only(draftId));
              cursorReq.onsuccess=()=>{
                const cursor=cursorReq.result;
                if(cursor){cursor.delete();cursor.continue();return}
                sections.forEach((section,si)=>section.items.forEach((item,ii)=>{
                  const original=groups[si]&&groups[si].items[ii];
                  if(original&&original.file)tx.objectStore('draftImages').put({
                    id:draftId+'|'+si+'|'+ii,draftId,
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
          if(autoDraftAgain){autoDraftAgain=false;scheduleAutoDraftSave(false,true)}
        }
      }
      
      async function finalizeCompletedSession(){
        let storedCustomGdv='';
        try{storedCustomGdv=global.localStorage.getItem('pti093_gdv_custom')||''}catch(e){}
        const gdv=$('gdv').value==='Nhập tên khác'
          ? ($('gdv').dataset.custom||storedCustomGdv)
          : ($('gdv').value||'');
        if(gdv){
          try{localStorage.setItem('pti093_gdv',gdv)}catch(e){}
        }
        try{
          await clearAutoDraft();
          // Xóa định danh phiên hiện tại khỏi bộ nhớ phiên; hồ sơ thật trên Drive/Local
          // vẫn giữ nguyên và có thể tìm/mở lại từ chức năng Tìm hồ sơ.
          state.localDraftId='';
          return true;
        }catch(e){
          console.warn('Không thể dọn bản nháp sau khi hoàn tất:',e);
          return false;
        }
      }
      
      async function clearAutoDraft(){
        autoDraftResetting=true;
        clearTimeout(autoDraftTimer);
        try{
          while(autoDraftSaving)await new Promise(resolve=>setTimeout(resolve,50));
          const db=await openLocalDraftDB();
          try{
            const tx=db.transaction(['drafts','draftImages'],'readwrite');
            tx.objectStore('drafts').delete(activeAutoDraftId);
            const idx=tx.objectStore('draftImages').index('draftId'),req=idx.openCursor(IDBKeyRange.only(activeAutoDraftId));
            req.onsuccess=()=>{const cur=req.result;if(cur){cur.delete();cur.continue()}};
            await localDraftTransactionDone(tx);
          }finally{db.close()}
          autoDraftImagesDirty=true;
        }finally{
          // Never leave autosave permanently disabled if IndexedDB open/delete fails.
          autoDraftResetting=false;
        }
      }
      
      async function restoreAutoDraft(){
        autoDraftRestoring=true;
        autoDraftUserChangedDuringRestore=false;
        try{
          const db=await openLocalDraftDB();
          let meta,images=[],foreignDraftFound=false;
          try{
            const readMeta=id=>new Promise((resolve,reject)=>{const q=db.transaction('drafts','readonly').objectStore('drafts').get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
            meta=await readMeta(activeAutoDraftId);
            if(!meta&&activeAutoDraftId!==PTI093_AUTO_DRAFT_ID){
              const legacyMeta=await readMeta(PTI093_AUTO_DRAFT_ID);
              if(legacyMeta){
                if(legacyMeta.sessionId===PTI093_SESSION_ID){activeAutoDraftId=PTI093_AUTO_DRAFT_ID;meta=legacyMeta;}
                else{foreignDraftFound=true;}
              }
            }
            if(meta){
              const draftId=activeAutoDraftId;
              images=await new Promise((resolve,reject)=>{const tx=db.transaction('draftImages','readonly'),q=tx.objectStore('draftImages').index('draftId').getAll(IDBKeyRange.only(draftId));q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error)});
            }
          }finally{db.close()}
          // Người dùng có thể thao tác trong lúc IndexedDB đang đọc. Không cho bản nháp cũ
          // ghi đè các thay đổi mới phát sinh trong tab; phần finally sẽ lưu trạng thái hiện tại.
          if(autoDraftUserChangedDuringRestore)return;
          if(foreignDraftFound){
            // Never delete another tab's legacy draft or its image blobs.
            state.driveRecordId='';state.localDraftId='';state.driveOpenIncomplete=false;state.localCopyFromIncompleteDrive=false;
            try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
            $('bks').value='';$('hoso').value='';setDateInput('');$('garage').value='';
            state.groups=[];state.current={title:'Bản ảnh chi tiết thiệt hại',items:[]};state.editing=-1;state.pages=[];state.pageDefs=[];
            $('title').value=state.current.title;render();renderLayout();
            setDriveState('Đã phát hiện nháp thuộc phiên khác; nháp cũ được giữ nguyên. Phiên này sẽ lưu riêng.');
            return;
          }
          if(!meta){
            // Clean only this session's orphaned image blobs.
            await clearAutoDraft();
            if(autoDraftUserChangedDuringRestore)return;
            // No active draft means this tab must not fall back to a stale Drive ID on the next save.
            state.driveRecordId='';state.localDraftId='';state.driveOpenIncomplete=false;state.localCopyFromIncompleteDrive=false;
            try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
            return;
          }
          // Defensive guard: never delete a draft whose recorded owner differs from this tab.
          if(!meta.sessionId||meta.sessionId!==PTI093_SESSION_ID){
            state.groups=[];state.current={title:'Bản ảnh chi tiết thiệt hại',items:[]};state.editing=-1;
            state.driveRecordId='';state.localDraftId='';state.driveOpenIncomplete=false;state.localCopyFromIncompleteDrive=false;state.pages=[];state.pageDefs=[];
            try{global.sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
            $('bks').value='';$('hoso').value='';setDateInput('');$('garage').value='';
            $('title').value=state.current.title;render();renderLayout();
            setDriveState('Nháp thuộc phiên khác được giữ nguyên; phiên hiện tại sẽ dùng vùng lưu riêng.');
            activeAutoDraftId=PTI093_AUTO_DRAFT_ID+'-'+PTI093_SESSION_ID;
            return;
          }
          const imageMap=new Map(images.map(x=>[x.sectionIndex+':'+x.itemIndex,x]));
          const groups=[];let missing=0;let nextAddSeq=state.addSeq||0;
          const expectedImages=(meta.sections||[]).reduce((n,g)=>n+((g.items||[]).length),0);
          (meta.sections||[]).forEach((g,si)=>{
            const items=[];
            (g.items||[]).forEach((it,ii)=>{
              const stored=imageMap.get(si+':'+ii);
              if(!stored||!stored.file){missing++;return}
              const f=stored.file instanceof File?stored.file:new File([stored.file],stored.fileName||it.fileName||'image.jpg',{type:stored.type||it.type||'image/jpeg',lastModified:stored.lastModified||it.lastModified||Date.now()});
              items.push({file:f,key:it.key||fileKey(f),caption:it.caption||'',rotate:it.rotate||0,addSeq:it.addSeq||(++nextAddSeq),driveFileId:it.driveFileId||'',driveFileName:it.driveFileName||'',driveUploadKey:it.driveUploadKey||''});
            });
            if(items.length)groups.push({title:g.title||'Bản ảnh chi tiết thiệt hại',items,isCurrent:!!g.isCurrent});
          });
          if(missing>0){
            const detail='Không thể khôi phục đầy đủ bản nháp tự động: thiếu dữ liệu của '+missing+'/'+expectedImages+' ảnh. Bản nháp được giữ nguyên; hồ sơ đang mở không bị thay đổi.';
            setDriveState(detail,false);
            msg(detail,true);
            return;
          }
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
          state.editing=-1;state.localDraftId=meta.localDraftId||'';state.driveRecordId=meta.driveRecordId||'';state.driveOpenIncomplete=!!meta.driveOpenIncomplete;state.localCopyFromIncompleteDrive=!!meta.localCopyFromIncompleteDrive;
          state.addSeq=0;groups.forEach(g=>g.items.forEach(it=>state.addSeq=Math.max(state.addSeq,it.addSeq||0)));
          if(state.driveRecordId){
            try{global.sessionStorage.setItem('pti093_driveRecordId',state.driveRecordId)}catch(e){}
          }
          $('title').value=state.current.title||meta.currentTitle||'Bản ảnh chi tiết thiệt hại';
          if(state.driveRecordId){$('driveId').textContent='Hồ sơ: '+state.driveRecordId;$('driveId').classList.remove('hidden')}
          render();renderLayout();autoDraftImagesDirty=false;
          if(state.driveOpenIncomplete){
            const detail='⚠️ Đã khôi phục bản nháp của hồ sơ Drive chưa tải đủ ảnh. Lưu đè/tải ảnh lên Drive đang bị khóa; hãy mở lại hồ sơ để tải đủ ảnh hoặc lưu bản sao tại máy.';
            setDriveState(detail,false);msg(detail,true);
          }else if(state.localCopyFromIncompleteDrive){
            const detail='⚠️ Đã khôi phục bản sao tại máy được tạo từ hồ sơ Drive chưa tải đủ ảnh. Hãy kiểm tra số ảnh trước khi tạo hồ sơ Drive mới.';
            setDriveState(detail,false);msg(detail,true);
          }else{
            if(groups.length||meta.bks||meta.caseNumber)setDriveState('Đã khôi phục bản nháp tự động · '+groups.reduce((n,g)=>n+g.items.length,0)+' ảnh.');
            msg(missing?'Đã khôi phục bản nháp nhưng thiếu '+missing+' ảnh trong bộ nhớ trình duyệt.':'Đã khôi phục công việc đang làm. Anh có thể tiếp tục ngay.',true);
          }
        }catch(e){
          console.warn('Không thể khôi phục bản nháp tự động:',e);
          const detail='Chưa đọc được bản nháp tự động từ bộ nhớ trình duyệt.';
          setDriveState(detail,false);msg(detail,true);
        }
        finally{
          autoDraftRestoring=false;
          if(autoDraftUserChangedDuringRestore){
            autoDraftUserChangedDuringRestore=false;
            saveAutoDraft().catch(e=>console.warn('Không tự lưu được thay đổi phát sinh trong lúc khôi phục nháp:',e));
          }
        }
      }
      function bindLifecycle(){
        ['bks','hoso','gdv','date','garage'].forEach(id=>{
          const el=$(id);if(!el)return;
          let stable={value:el.value,custom:el.dataset?el.dataset.custom:undefined};
          const remember=()=>{stable={value:el.value,custom:el.dataset?el.dataset.custom:undefined};};
          const restore=()=>{
            el.value=stable.value;
            if(el.dataset){
              if(stable.custom===undefined)delete el.dataset.custom;
              else el.dataset.custom=stable.custom;
            }
          };
          el.addEventListener('focus',remember);
          el.addEventListener('beforeinput',event=>{if(state.workspaceOpenPending){event.preventDefault();return;}remember();});
          const onEdit=()=>{
            if(state.workspaceOpenPending){restore();return;}
            remember();
            scheduleAutoDraftSave(false);
          };
          el.addEventListener('input',onEdit);
          el.addEventListener('change',onEdit);
        });
        window.addEventListener('pagehide',()=>{
          clearAutoDraftTimer();
          saveAutoDraft().catch(e=>console.warn('Không kịp tự lưu bản nháp:',e));
        });
        document.addEventListener('visibilitychange',()=>{
          if(document.visibilityState==='hidden'){
            clearAutoDraftTimer();
            saveAutoDraft().catch(e=>console.warn('Không tự lưu bản nháp khi ẩn trang:',e));
          }
        });
        restoreAutoDraft();
      }
      return {scheduleAutoDraftSave,saveAutoDraft,finalizeCompletedSession,clearAutoDraft,restoreAutoDraft,clearAutoDraftTimer,bindLifecycle};
    }
  };
})(window);
