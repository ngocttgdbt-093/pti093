(function(global){
  'use strict';
  global.PTI093LocalCaseStorage = {
    install: function(deps){
      const {state, $, msg, getDateISO, selectedGdv, snapshotGroupsForProject, setDriveState, openLocalDraftDB, localDraftTransactionDone, setDateInput, render, renderLayout, deviceStorageLabel, setOpenLoad, finishOpenLoad} = deps;
      function renderLocalSaveFeedback(id,pct,label,detail='',failed=false){
        const host=document.getElementById('ptiPreviewFeedback');
        if(!host)return;
        host.style.display='grid';host.style.visibility='visible';
        let panel=document.getElementById('ptiLocalSaveFeedback');
        if(!panel){
          panel=document.createElement('div');panel.id='ptiLocalSaveFeedback';
          panel.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #b8d9c7;border-radius:10px;background:#f3fbf6;color:#174d34;font-size:13px;line-height:1.5';
          panel.innerHTML='<div id="ptiLocalSaveId" style="font-weight:800;overflow-wrap:anywhere;margin-bottom:5px"></div><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span id="ptiLocalSaveLabel" style="font-weight:700"></span><strong id="ptiLocalSavePct">0%</strong></div><div style="height:9px;border-radius:999px;background:#dcebe2;overflow:hidden;margin-top:6px"><div id="ptiLocalSaveBar" style="height:100%;width:0%;background:#07834f;transition:width .2s"></div></div><div id="ptiLocalSaveDetail" style="margin-top:5px;color:#52685b;overflow-wrap:anywhere"></div>';
          host.prepend(panel);
        }
        panel.style.borderColor=failed?'#d97777':'#b8d9c7';panel.style.background=failed?'#fff5f5':'#f3fbf6';panel.style.color=failed?'#8a2424':'#174d34';
        const idEl=document.getElementById('ptiLocalSaveId');if(idEl)idEl.textContent='💻 ID hồ sơ local: '+(id||'Đang tạo ID…');
        const labelEl=document.getElementById('ptiLocalSaveLabel');if(labelEl)labelEl.textContent=label;
        const pctEl=document.getElementById('ptiLocalSavePct');if(pctEl)pctEl.textContent=typeof pct==='number'?pct+'%':'!';
        const bar=document.getElementById('ptiLocalSaveBar');if(bar){bar.style.width=(typeof pct==='number'?Math.max(0,Math.min(100,pct)):100)+'%';bar.style.background=failed?'#c43d3d':'#07834f'}
        const detailEl=document.getElementById('ptiLocalSaveDetail');if(detailEl)detailEl.textContent=detail;
      }

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
        // Bản local độc lập, không giữ liên kết tới record/ảnh Drive.
        for(const g of [...(state.groups||[]),state.current||{}])for(const it of (g.items||[])){
          it.driveFileId='';it.driveFileName='';it.driveUploadKey='';
        }
        state.driveRecordId='';state.localDraftId=id;
        try{sessionStorage.removeItem('pti093_driveRecordId')}catch(e){}
        try{localStorage.removeItem('pti093_driveRecordId')}catch(e){}
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
        state.groups=groups.slice(1);state.current=groups[0]||{title:'Bản ảnh chi tiết thiệt hại',items:[]};state.editing=-1;
        state.addSeq=0;groups.forEach(g=>g.items.forEach(it=>state.addSeq=Math.max(state.addSeq,it.addSeq||0)));
        $('title').value=state.current.title;
        $('driveId').textContent='💻 Bản lưu tại máy: '+id;$('driveId').classList.remove('hidden');
        finishOpenLoad(source,groups.reduce((n,g)=>n+g.items.length,0));
        setDriveState('✓ Đã tải hoàn tất ảnh từ '+source+' · '+groups.reduce((n,g)=>n+g.items.length,0)+' ảnh.');
        render();renderLayout();
        msg(missing?'Đã mở nháp nhưng thiếu dữ liệu của '+missing+' ảnh trong kho trình duyệt.':'✓ Đã tải hoàn tất ảnh từ '+source+'. Có thể chỉnh sửa, lưu lại hoặc tạo hồ sơ Drive.',true);
        window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'});
      }
      return {renderLocalSaveFeedback, saveLocalDraft, openLocalDraft};
    }
  };
})(window);
