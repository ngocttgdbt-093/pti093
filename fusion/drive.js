(function(global){
  'use strict';
  global.PTI093DriveFusion = {
    install: function(deps){
      const {state, $, msg, setDriveState, setOpenLoad, finishOpenLoad, getAllGroups, snapshotGroupsForProject, selectedGdv, scheduleAutoDraftSave, finalizeCompletedSession, getDateISO, setDateInput, render, renderLayout, deviceStorageLabel, searchQueryVariants, getLocalDrafts, openLocalDraft, normalizeRecordSearch, gdvSearchMatches, gdvInitials, wrap} = deps;
      const PTI093_API='https://script.google.com/macros/s/AKfycbwmydXC8QZEKDBoRvJOGZSfQjdYSWzteyAMIYjr7RfoEIiHFetnGUj8A0FlB0hjJcB2kw/exec';
      function readStoredDriveRecordId(){
        try{return global.sessionStorage.getItem('pti093_driveRecordId')||''}catch(e){return ''}
      }
      function persistDriveRecordId(recordId){
        try{global.sessionStorage.setItem('pti093_driveRecordId',recordId)}catch(e){}
        try{global.localStorage.setItem('pti093_driveRecordId',recordId)}catch(e){}
      }
      function incompleteDriveOpenMessage(){
        return 'Hồ sơ Drive chưa tải đủ ảnh. Không thể lưu đè hoặc tải ảnh lên cho đến khi mở lại hồ sơ và xác nhận đã tải đủ ảnh; có thể lưu một bản sao tại máy.';
      }
      function driveWriteBlockedMessage(){
        return state.workspaceOpenPending||state.driveOpenPending
          ? 'Đang mở hồ sơ. Hãy chờ tải xong trước khi lưu hoặc tải ảnh lên.'
          : incompleteDriveOpenMessage();
      }
      
      
      /* Core workspace snapshot is injected by the app. */
      
      function buildProjectData(){
        return {version:'PTI093-1.2',recordId:state.driveRecordId||'',caseNumber:($('hoso').value||'').trim(),bks:($('bks').value||'').trim(),date:getDateISO(),garage:($('garage').value||'').trim(),maHoSo:($('hoso').value||'').trim(),gdv:selectedGdv(),status:state.localDraftId?'Ảnh lưu tại máy':'Đang xử lý',storageType:state.localDraftId?'local':'drive',settings:{paperSize:'A4',orientation:state.orientation,imagesPerPage:state.per},sections:snapshotGroupsForProject().map(g=>({title:g.title,items:g.items.map((it,idx)=>({fileId:it.driveFileId||'',fileName:it.driveFileName||((it.file&&it.file.name)||''),clientKey:it.key||'',uploadKey:it.driveUploadKey||'',caption:it.caption||'',rotate:((it.rotate||0)%360+360)%360,addSeq:it.addSeq||idx+1}))})),updatedAt:new Date().toISOString()};
      }

      async function optimizeDriveImage(file){
        // Tối ưu ẢNH TRƯỚC KHI GỬI DRIVE để giảm mạnh dung lượng nhưng vẫn đủ rõ cho giám định.
        // Mục tiêu: cạnh dài tối đa 1920px, JPEG quality 0.78.
        // JPEG nhỏ đã có kích thước phù hợp được giữ nguyên để tránh tốn CPU vô ích.
        const maxSide=1920;
        const quality=0.78;
        const keepSmallBytes=900*1024;
        if(!file || !file.type || !file.type.startsWith('image/')){
          return {blob:file,fileName:file.name,mimeType:file.type||'application/octet-stream',originalSize:file&&file.size||0,optimizedSize:file&&file.size||0,skipped:true};
        }
      
        return await new Promise((resolve,reject)=>{
          const url=URL.createObjectURL(file);
          const cleanup=()=>URL.revokeObjectURL(url);
          const finish=(blob)=>{
            cleanup();
            if(!blob){reject(new Error('Không nén được ảnh'));return}
            const base=(file.name||'anh').replace(/\.[^.]+$/,'');
            const result={
              blob,
              fileName:base+'.jpg',
              mimeType:'image/jpeg',
              originalSize:file.size,
              optimizedSize:blob.size
            };
            // Nếu ảnh nguồn vốn đã rất nhỏ và việc nén lại không đem lại lợi ích,
            // giữ bản gốc để tốc độ phản hồi tốt hơn.
            if(blob.size>=file.size && file.size<=keepSmallBytes){
              result.blob=file;
              result.fileName=/\.(jpe?g)$/i.test(file.name||'')?file.name:base+'.jpg';
              result.mimeType=file.type||'image/jpeg';
              result.optimizedSize=file.size;
              result.skipped=true;
            }
            resolve(result);
          };
          const drawAndEncode=(source)=>{
            try{
              let w=source.naturalWidth||source.width;
              let h=source.naturalHeight||source.height;
              const scale=Math.min(1,maxSide/Math.max(w,h));
              w=Math.max(1,Math.round(w*scale));
              h=Math.max(1,Math.round(h*scale));
              const canvas=document.createElement('canvas');
              canvas.width=w;
              canvas.height=h;
              const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
              ctx.drawImage(source,0,0,w,h);
              canvas.toBlob(finish,'image/jpeg',quality);
            }catch(err){
              cleanup();
              reject(err);
            }
          };
          if(window.createImageBitmap){
            createImageBitmap(file,{imageOrientation:'from-image'}).then(bitmap=>{
              drawAndEncode(bitmap);
              if(bitmap.close) bitmap.close();
            }).catch(()=>{
              const img=new Image();
              img.onload=()=>drawAndEncode(img);
              img.onerror=()=>{cleanup();reject(new Error('Không đọc được ảnh'))};
              img.src=url;
            });
          }else{
            const img=new Image();
            img.onload=()=>drawAndEncode(img);
            img.onerror=()=>{cleanup();reject(new Error('Không đọc được ảnh'))};
            img.src=url;
          }
        });
      }
      async function sha256HexBlob(blob){
        if(!blob) throw new Error('Không có dữ liệu ảnh để tính mã xác nhận');
        if(!window.crypto || !crypto.subtle) throw new Error('Trình duyệt không hỗ trợ SHA-256');
        const buf=await blob.arrayBuffer();
        const digest=await crypto.subtle.digest('SHA-256',buf);
        return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
      }
      async function openRecordFromDriveUnlocked(recordId){
        if(state.driveOpenPending)throw new Error('Đang mở một hồ sơ Drive khác. Hãy chờ thao tác đó hoàn tất trước khi mở hồ sơ tiếp theo.');
        state.driveOpenPending=true;
        setOpenLoad('Google Drive',0,0,'Đang mở hồ sơ và đọc danh sách ảnh từ Google Drive...');
        setDriveState('Đang tải hồ sơ từ Google Drive...');
        let data;
        try{
          data=await fetch(PTI093_API+'?action=openRecord&recordId='+encodeURIComponent(recordId)+'&_='+Date.now(),{cache:'no-store'}).then(r=>r.json());
        }catch(error){
          state.driveOpenPending=false;
          const detail='Không thể đọc hồ sơ từ Google Drive: '+(error&&error.message?error.message:String(error));
          setOpenLoad('Google Drive',0,0,detail);setDriveState(detail,false);
          throw error;
        }
        if(!data.success){
          state.driveOpenPending=false;
          const detail=data.error||'Không mở được hồ sơ';
          setOpenLoad('Google Drive',0,0,detail);setDriveState(detail,false);
          throw new Error(detail);
        }
        // Giữ driveOpenPending=true suốt quá trình tải ảnh để chặn mở chồng nhiều hồ sơ.
        // driveOpenIncomplete tiếp tục bảo vệ trường hợp tải xong nhưng thiếu ảnh.
        // Khoá thao tác ghi ngay khi biết đang mở hồ sơ mới; không đợi tải xong ảnh,
        // tránh người dùng lưu đè trong lúc danh sách ảnh vẫn đang được tải dở.
        state.driveOpenIncomplete=true;
        const p=data.project||{},rec=data.record||{};
        state.driveRecordId=rec.recordId||p.recordId||recordId;state.localDraftId='';
        // Storage chỉ là tiện ích khôi phục ID; không để chính sách chặn storage làm hỏng việc mở hồ sơ Drive.
        persistDriveRecordId(state.driveRecordId);
        // Khi mở hồ sơ Drive trên thiết bị khác, không để dữ liệu AUTO-DRAFT cũ
        // tiếp tục hiển thị trong ô "Mã hồ sơ".
        $('bks').value=p.bks||rec.bks||'';
        $('hoso').value=p.caseNumber||rec.caseNumber||'';
        setDateInput(p.date||rec.date||getDateISO()||'');
        const gdv=p.gdv||rec.gdv||'';
        if([...$('gdv').options].some(o=>o.value===gdv))$('gdv').value=gdv;
        else if(gdv){$('gdv').value='Nhập tên khác';$('gdv').dataset.custom=gdv}
        const settings=p.settings||{};
        if(settings.orientation)state.orientation=settings.orientation;
        if(settings.imagesPerPage){
          state.per=Number(settings.imagesPerPage);
          document.querySelectorAll('#counts .opt').forEach(x=>x.classList.toggle('on',Number(x.textContent)===state.per));
        }
        document.querySelectorAll('#orient .opt').forEach(x=>x.classList.toggle('on',x.dataset.o===state.orientation));
      
        const serverImages=Array.isArray(data.images)?data.images:[];
        const usedImageIds=new Set();
        const loadedGroups=[];
        let fallbackIndex=0,total=0;
        const expectedImages=Math.max(serverImages.length,(p.sections||[]).reduce((n,g)=>n+((g.items||[]).length),0));
        let loadedCount=0;
        setOpenLoad('Google Drive',0,expectedImages,
          expectedImages
            ? 'Đang tải hồ sơ '+state.driveRecordId+' · ảnh từ Google Drive về thiết bị...'
            : 'Hồ sơ '+state.driveRecordId+' không có ảnh để tải.');
      
        const loadOne=async(it,sectionIndex,itemIndex)=>{
          let fileId=it.fileId||'';
          if(!fileId && it.fileName){
            const match=serverImages.find(x=>!usedImageIds.has(x.fileId)&&String(x.fileName||'')===String(it.fileName||''));
            if(match)fileId=match.fileId;
          }
          if(!fileId){
            while(fallbackIndex<serverImages.length && usedImageIds.has(serverImages[fallbackIndex].fileId))fallbackIndex++;
            if(serverImages[fallbackIndex])fileId=serverImages[fallbackIndex].fileId;
          }
          if(fileId){
            const matched=serverImages.find(x=>x.fileId===fileId);
            if(matched)usedImageIds.add(matched.fileId);
          }
          if(!fileId) return null;
          try{
            const ir=await fetch(PTI093_API+'?action=getImage&fileId='+encodeURIComponent(fileId)+'&_='+Date.now(),{cache:'no-store'}).then(x=>x.json());
            if(!ir.success)throw new Error(ir.error||'Không tải được ảnh');
            const bytes=Uint8Array.from(atob(ir.base64||''),ch=>ch.charCodeAt(0));
            const blob=new Blob([bytes],{type:ir.mimeType||'image/jpeg'});
            const file=new File([blob],ir.fileName||it.fileName||'image.jpg',{type:ir.mimeType||'image/jpeg'});
            fallbackIndex++;
            total++;
            loadedCount++;
            setOpenLoad('Google Drive',loadedCount,expectedImages,'Đang tải ảnh '+loadedCount+'/'+expectedImages+' từ Google Drive...');
            return {file,key:it.clientKey||file.name+'|'+file.size+'|'+file.lastModified,caption:it.caption||'',addSeq:it.addSeq||(++state.addSeq),rotate:it.rotate||0,driveFileId:fileId,driveFileName:ir.fileName||it.fileName||'',driveUploadKey:it.uploadKey||''};
          }catch(e){console.warn('Không tải được ảnh',fileId,e);return null}
        };
      
        for(const g of (p.sections||[])){
          const items=[];
          for(let j=0;j<(g.items||[]).length;j++){
            const loaded=await loadOne(g.items[j],loadedGroups.length,j);
            if(loaded)items.push(loaded);
          }
          if(items.length)loadedGroups.push({title:g.title||'Bản ảnh chi tiết thiệt hại',items});
        }
      
        // Tương thích hồ sơ đã tạo/upload nhưng project.pti chưa ghi fileId vào từng item.
        if(!loadedGroups.length && serverImages.length){
          const items=[];
          for(const img of serverImages){
            const loaded=await loadOne({fileId:img.fileId,fileName:img.fileName},0,items.length);
            if(loaded)items.push(loaded);
          }
          if(items.length)loadedGroups.push({title:'Bản ảnh chi tiết thiệt hại',items});
        }
      
        state.addSeq=0;
        loadedGroups.forEach(g=>g.items.forEach(it=>state.addSeq=Math.max(state.addSeq,it.addSeq||0)));
      
        // Mở hồ sơ ở đúng nội dung đầu tiên để ảnh hiện ngay trong vùng chỉnh sửa.
        state.localCopyFromIncompleteDrive=false;
        state.groups=loadedGroups.slice(1);
        state.current=loadedGroups[0]||{title:'Bản ảnh chi tiết thiệt hại',items:[]};
        state.editing=-1;
        $('title').value=state.current.title;
        $('driveId').textContent='Hồ sơ: '+state.driveRecordId;
        $('driveId').classList.remove('hidden');
        const incomplete=expectedImages>0&&total<expectedImages;
        state.driveOpenPending=false;
        state.driveOpenIncomplete=incomplete;
        if(incomplete){
          const missing=expectedImages-total;
          const detail='⚠️ Đã mở hồ sơ Drive nhưng chỉ tải được '+total+'/'+expectedImages+' ảnh; còn thiếu '+missing+' ảnh. Không lưu đè lên Drive cho đến khi mở lại và tải đủ ảnh.';
          setOpenLoad('Google Drive',total,expectedImages,detail);
          setDriveState(detail,false);
          msg(detail+' Có thể lưu một bản sao tại máy để giữ các ảnh đã tải được.',true);
        }else{
          finishOpenLoad('Google Drive',total);
          setDriveState('✓ Đã tải hoàn tất hồ sơ '+state.driveRecordId+' từ Google Drive · '+total+' ảnh.');
          msg(total?'✓ Đã tải hoàn tất ảnh từ Google Drive. Có thể chỉnh sửa và lưu tiếp.':'Đã mở hồ sơ Drive nhưng hồ sơ này không có ảnh để tải.',true);
        }
        $('driveId').textContent='☁️ Hồ sơ Drive: '+state.driveRecordId;
        $('driveId').classList.remove('hidden');
        render();
        renderLayout();
        window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'});
      }
      
      
      
      
      
      async function openRecordFromDrive(recordId){
        if(state.workspaceOpenPending)throw new Error('Đang mở hồ sơ khác. Hãy chờ thao tác đó hoàn tất trước khi mở hồ sơ tiếp theo.');
        state.workspaceOpenPending=true;
        try{
          const result=await openRecordFromDriveUnlocked(recordId);
          state.workspaceRevision=(Number(state.workspaceRevision)||0)+1;
          state.driveOpenPending=false;state.workspaceOpenPending=false;
          scheduleAutoDraftSave(true);
          return result;
        }finally{state.driveOpenPending=false;state.workspaceOpenPending=false}
      }
      function recordMatchesQuery(row,query){
        const fields=[row.caseNumber,row.maHoSo,row.bks,row.gdv,row.adjuster,row.status];
        return fields.some(v=>normalizeRecordSearch(v).includes(normalizeRecordSearch(query)))||gdvSearchMatches(query,row.gdv||row.adjuster)
      }
      
      function recordTime(row){return String(row.updatedAt||row.createdAt||row.date||'')}
      
      function sameLocalDriveRecord(local,drive){
        const localIds=[local.id,local.driveRecordId,local.recordId].filter(Boolean).map(String);
        const driveId=String(drive.recordId||drive.id||'');
        if(driveId&&localIds.includes(driveId))return true;
        const lc=normalizeRecordSearch(local.caseNumber||local.maHoSo),dc=normalizeRecordSearch(drive.caseNumber||drive.maHoSo);
        const lb=normalizeRecordSearch(local.bks),db=normalizeRecordSearch(drive.bks);
        return !!(lc&&dc&&lc===dc&&lb&&db&&lb===db)
      }
      
      async function searchDriveRecords(){
        const keyword=($('driveSearch').value||'').trim(),box=$('driveSearchResults');
        if(!keyword){box.innerHTML='<div class="muted">Nhập Mã HS, BKS hoặc tên GĐV để tìm.</div>';return}
        box.innerHTML='<div class="muted">Đang tìm hồ sơ Drive và bản lưu tại máy...</div>';
        const variants=searchQueryVariants(keyword);
        const [driveOutcome,localOutcome]=await Promise.allSettled([
          Promise.all(variants.map(term=>fetch(PTI093_API+'?action=searchRecords&keyword='+encodeURIComponent(term)+'&_='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})))
            .then(results=>{const map=new Map();let lastError='';for(const d of results){if(d&&d.success){for(const row of d.results||[])map.set(String(row.recordId||row.id||JSON.stringify(row)),row)}else lastError=d&&d.error||lastError}return {success:map.size>0||results.some(d=>d&&d.success),results:[...map.values()],error:lastError}}),
          getLocalDrafts()
        ]);
        const key=normalizeRecordSearch(keyword);
        const driveRows=driveOutcome.status==='fulfilled'&&driveOutcome.value.success
          ?driveOutcome.value.results.filter(r=>recordMatchesQuery(r,keyword)||variants.some(v=>recordMatchesQuery(r,v))).sort((a,b)=>recordTime(b).localeCompare(recordTime(a))):[];
        // AUTO-DRAFT chỉ phục vụ phục hồi sau F5/reload, KHÔNG phải hồ sơ Local độc lập.
        // Không đưa AUTO-DRAFT vào kết quả Search để tránh nhầm hồ sơ Drive thành "Tại máy".
        const localRows=localOutcome.status==='fulfilled'
          ?localOutcome.value
            .filter(r=>r.id!==PTI093_AUTO_DRAFT_ID && r.auto!==true)
            .filter(r=>recordMatchesQuery(r,keyword)||variants.some(v=>recordMatchesQuery(r,v)))
            .sort((a,b)=>recordTime(b).localeCompare(recordTime(a))):[];
        if(driveOutcome.status==='rejected'||(driveOutcome.status==='fulfilled'&&!driveOutcome.value.success)){
          const err=driveOutcome.status==='rejected'?driveOutcome.reason:driveOutcome.value.error;
          if(!localRows.length){box.innerHTML='<div class="muted">Không truy cập được hồ sơ Drive: '+String(err||'Lỗi tìm kiếm')+'</div>';return}
        }
        if(localOutcome.status==='rejected'&&!driveRows.length){box.innerHTML='<div class="muted">Không đọc được bản lưu tại máy: '+String(localOutcome.reason&&localOutcome.reason.message||localOutcome.reason)+'</div>';return}
        const uniqueLocal=[],seenLocal=new Set();
        for(const row of localRows){const id=String(row.id||row.recordId||'');if(!seenLocal.has(id)){seenLocal.add(id);uniqueLocal.push(row)}}
        const visibleDrive=driveRows.filter(row=>!uniqueLocal.some(local=>sameLocalDriveRecord(local,row)));
        const results=[
          ...uniqueLocal.map(row=>({source:'local',row,time:recordTime(row)})),
          ...visibleDrive.map(row=>({source:'drive',row,time:recordTime(row)}))
        ].sort((a,b)=>b.time.localeCompare(a.time)||(a.source==='local'?-1:1));
        if(!results.length){box.innerHTML='<div class="muted">Không tìm thấy hồ sơ phù hợp. Thử Mã HS, BKS, tên GĐV hoặc chữ cái đầu của họ tên (ví dụ: nmn).</div>';return}
        box.innerHTML='';
        const summary=document.createElement('div');summary.className='searchSummary';
        const count=document.createElement('strong');count.textContent='Tìm thấy '+results.length+' hồ sơ';
        const note=document.createElement('span');note.textContent='Sắp xếp mới nhất trước · Ưu tiên bản có ảnh trên thiết bị này';
        summary.append(count,note);box.appendChild(summary);
        const wrap=document.createElement('div');wrap.className='searchTableWrap';
        const table=document.createElement('table');table.className='searchTable';
        table.innerHTML='<thead><tr><th>Hồ sơ</th><th>Nguồn</th><th>GĐV</th><th>Cập nhật</th><th>Trạng thái</th><th></th></tr></thead><tbody></tbody>';
        const tbody=table.querySelector('tbody');
        const fmtDate=value=>{if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('vi-VN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
        for(const item of results){
          const {source,row}=item,tr=document.createElement('tr');
          const td=(label)=>{const el=document.createElement('td');el.dataset.label=label;return el};
          const hồ=td('Hồ sơ'),main=document.createElement('div');main.className='caseMain';main.textContent='Mã HS: '+(row.caseNumber||row.maHoSo||'—');hồ.appendChild(main);
          const sub=document.createElement('span');sub.className='subline';sub.textContent='BKS: '+(row.bks||'—');hồ.appendChild(sub);
          const src=td('Nguồn'),badge=document.createElement('span');
          badge.className='sourceBadge '+(source==='local'?'local':'drive');
          badge.textContent=source==='local'?'💻 Tại máy':'☁️ Drive';
          src.appendChild(badge);
          const gdv=td('GĐV');gdv.textContent=row.gdv||row.adjuster||'Chưa có GĐV';
          const time=td('Cập nhật');time.textContent=fmtDate(row.updatedAt||row.createdAt||row.date);
          const status=td('Trạng thái');status.textContent=row.status||(source==='local'?'Bản lưu tại máy':'Hồ sơ Drive');
          const action=td('Thao tác'),button=document.createElement('button');button.className='btn light searchOpenBtn';button.textContent=source==='local'?'Mở bản tại máy':'Mở hồ sơ Drive';
      
          button.onclick=async()=>{
            button.disabled=true;
            const originalText=button.textContent;
            button.textContent=source==='local'?'⏳ Đang tải từ '+deviceStorageLabel()+'...':'⏳ Đang tải từ Drive...';
            try{
              if(source==='local')await openLocalDraft(row.id);
              else await openRecordFromDrive(row.recordId||row.id);
            }catch(e){
              setDriveState('Không tải được hồ sơ: '+e.message,false);
              msg('Lỗi mở hồ sơ: '+e.message,true);
            }finally{
              button.disabled=false;
              button.textContent=originalText;
            }
          };
          hồ.appendChild(button);button.classList.add('recordOpenPrimary');tr.append(hồ,src,gdv,time,status,action);tbody.appendChild(tr);
        }
        wrap.appendChild(table);box.appendChild(wrap);
      }

      async function saveProjectToDrive(showMsg=true){
        if(state.workspaceOpenPending||state.driveOpenPending||state.driveOpenIncomplete)throw new Error(driveWriteBlockedMessage());
        const id=state.driveRecordId||readStoredDriveRecordId()||'';
        if(!id)throw new Error('Chưa có hồ sơ Drive.');
        const revision=String(Date.now())+'-'+Math.random().toString(36).slice(2,8),payload=JSON.stringify({action:'saveProject',recordId:id,revision,project:buildProjectData()});
        await fetch(PTI093_API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:payload,cache:'no-store',keepalive:false});
        const started=Date.now();
        while(Date.now()-started<30000){
          try{const res=await fetch(PTI093_API+'?action=projectStatus&recordId='+encodeURIComponent(id)+'&revision='+encodeURIComponent(revision)+'&_='+Date.now(),{cache:'no-store'}),data=await res.json();if(data&&data.success&&data.found){if(showMsg)msg('Đã lưu dữ liệu hồ sơ lên Google Drive.',true);return data}}catch(e){}
          await new Promise(resolve=>setTimeout(resolve,700));
        }
        throw new Error('Chưa xác nhận được project.pti trên máy chủ.');
      }
      
      function driveImageKey(it){
        const f=it&&it.file;
        if(!f)return '';
        return [
          f.name||'',
          f.size||0,
          f.lastModified||0,
          f.webkitRelativePath||''
        ].join('|');
      }
      
      function getDriveUploadedKeys(recordId){
        try{
          return new Set(JSON.parse(localStorage.getItem('pti093_drive_uploaded_'+recordId)||'[]'));
        }catch(e){return new Set()}
      }
      
      function saveDriveUploadedKeys(recordId,set){
        try{
          localStorage.setItem('pti093_drive_uploaded_'+recordId,JSON.stringify([...set]));
        }catch(e){}
      }
      
      function getDrivePendingUploadKey(recordId,imageKey){
        try{
          const map=JSON.parse(localStorage.getItem('pti093_drive_pending_'+recordId)||'{}');
          return String(map[imageKey]||'');
        }catch(e){return ''}
      }
      
      function saveDrivePendingUploadKey(recordId,imageKey,uploadKey){
        try{
          const name='pti093_drive_pending_'+recordId;
          const map=JSON.parse(localStorage.getItem(name)||'{}');
          if(uploadKey)map[imageKey]=uploadKey;
          else delete map[imageKey];
          localStorage.setItem(name,JSON.stringify(map));
        }catch(e){}
      }
      
      async function prepareDriveItem(it,index,total){
        const optimized=await optimizeDriveImage(it.file);
        const dataUrl=await new Promise((resolve,reject)=>{
          const fr=new FileReader();
          fr.onload=()=>resolve(fr.result);
          fr.onerror=()=>reject(new Error('Không đọc được ảnh số '+(index+1)));
          fr.readAsDataURL(optimized.blob);
        });
        const base64=String(dataUrl).split(',')[1]||'';
        const uploadKey='sha256:'+await sha256HexBlob(optimized.blob);
        return {
          key:driveImageKey(it),
          uploadKey,
          payload:JSON.stringify({
            action:'uploadImage',
            recordId:window.__pti093_drive_record_id,
            clientKey:driveImageKey(it),
            uploadKey,
            fileName:optimized.fileName,
            mimeType:optimized.mimeType,
            base64
          })
        };
      }
      
      async function waitForUploadStatus(recordId,uploadKey){
        // V19: ưu tiên fetch JSON trực tiếp. Apps Script ContentService có thể
        // chuyển hướng phản hồi; fetch đã được frontend sử dụng ổn định cho các API khác.
        // JSONP chỉ giữ làm lớp dự phòng thứ hai.
        const maxChecks=12;
        const deadline=Date.now()+30000;
        let lastError=null;
      
        for(let i=0;i<maxChecks&&Date.now()<deadline;i++){
          let useJsonp=false;
          try{
            const controller=new AbortController();
            const timer=setTimeout(()=>controller.abort(),3500);
            try{
              const url=PTI093_API+'?action=uploadStatus&recordId='+encodeURIComponent(recordId)+'&uploadKey='+encodeURIComponent(uploadKey)+'&_='+Date.now();
              const res=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});
              if(!res.ok)throw new Error('Máy chủ trả HTTP '+res.status+'.');
              const data=await res.json();
              if(data&&data.success&&data.found&&String(data.recordId||'')===String(recordId||'')&&String(data.uploadKey||'')===String(uploadKey||'')){
                return data;
              }
              lastError=new Error('Máy chủ chưa ghi nhận ảnh.');
            }finally{
              clearTimeout(timer);
            }
          }catch(e){
            useJsonp=true;
            lastError=e&&e.name==='AbortError'
              ? new Error('Quá thời gian đọc trạng thái upload.')
              : e;
          }
      
          // JSONP chỉ là lớp dự phòng khi fetch không đọc được phản hồi.
          // Nếu fetch đã trả lời found:false, đừng hỏi máy chủ thêm một lần bằng JSONP;
          // poll lại theo nhịp tăng dần để giảm tải trong khi vẫn chờ xác nhận.
          if(useJsonp) try{
            const result=await new Promise((resolve,reject)=>{
              const cb='pti093UploadStatus_'+Date.now()+'_'+Math.random().toString(36).slice(2);
              const script=document.createElement('script');
              let settled=false;
              const cleanup=()=>{
                try{delete window[cb]}catch(e){window[cb]=undefined}
                try{script.remove()}catch(e){}
              };
              const finish=(fn,value)=>{
                if(settled)return;
                settled=true;
                cleanup();
                fn(value);
              };
              window[cb]=(data)=>{
                if(data&&data.success&&data.found&&String(data.recordId||'')===String(recordId||'')&&String(data.uploadKey||'')===String(uploadKey||'')){
                  finish(resolve,data);
                }else{
                  finish(resolve,data||{success:false,found:false});
                }
              };
              script.onerror=()=>finish(reject,new Error('Không đọc được trạng thái upload từ máy chủ.'));
              script.src=PTI093_API+'?action=uploadStatus&recordId='+encodeURIComponent(recordId)+'&uploadKey='+encodeURIComponent(uploadKey)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
              document.body.appendChild(script);
              setTimeout(()=>finish(reject,new Error('Quá thời gian kiểm tra trạng thái upload.')),2500);
            });
            if(result&&result.success&&result.found)return result;
            lastError=new Error('Máy chủ chưa ghi nhận ảnh.');
          }catch(e){
            lastError=e;
          }
      
          if(i<maxChecks-1&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,Math.min(2000,500*(i+1))));
        }
      
        throw lastError||new Error('Không xác nhận được ảnh đã lưu.');
      }
      
      async function sendDrivePayload(payload,recordId,uploadKey){
        // V17: ưu tiên postMessage; nếu lớp ContentService của Apps Script làm mất phản hồi,
        // kiểm tra trạng thái upload qua JSONP mà không gửi POST ảnh lần thứ hai.
        // Không khóa cứng event.source hoặc data.source vì Apps Script có thể chuyển hướng
        // phản hồi qua miền googleusercontent.com.
        const token='pti093_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        const iframe=document.createElement('iframe');
        iframe.name=token;
        iframe.style.cssText='position:fixed;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-10px;top:-10px';
        const form=document.createElement('form');
        form.method='POST';
        form.action=PTI093_API;
        form.target=token;
        form.style.display='none';
        const input=document.createElement('input');
        input.type='hidden';
        input.name='payload';
        input.value=payload;
        form.appendChild(input);
        document.body.appendChild(iframe);
        document.body.appendChild(form);
      
        return await new Promise((resolve,reject)=>{
          let settled=false;
          const timeoutMs=8000;
      
          const cleanup=()=>{
            window.removeEventListener('message',onMessage);
            clearTimeout(timer);
            try{form.remove()}catch(e){}
            try{iframe.remove()}catch(e){}
          };
      
          const finish=(fn,value)=>{
            if(settled)return;
            settled=true;
            cleanup();
            fn(value);
          };
      
          const onMessage=(event)=>{
            let data=event.data;
            if(typeof data==='string'){
              try{data=JSON.parse(data)}catch(e){return}
            }
            if(!data || typeof data!=='object')return;
            if(String(data.recordId||'')!==String(recordId||''))return;
            if(String(data.uploadKey||'')!==String(uploadKey||''))return;
      
            if(data.success===true || data.success===1 || data.ok===true){
              finish(resolve,data);
            }else if(data.success===false || data.ok===false){
              finish(reject,new Error(data.error||data.message||'Máy chủ không xác nhận được ảnh.'));
            }
          };
      
          const timer=setTimeout(async()=>{
            // Không gửi lại ảnh để tránh tạo bản sao. Chỉ hỏi trạng thái mà máy chủ đã ghi.
            try{
              const status=await waitForUploadStatus(recordId,uploadKey);
              finish(resolve,status);
            }catch(statusError){
              finish(reject,new Error('Không nhận được xác nhận trực tiếp; kiểm tra trạng thái dự phòng thất bại: '+(statusError&&statusError.message?statusError.message:String(statusError))));
            }
          },timeoutMs);
      
          window.addEventListener('message',onMessage);
      
          try{
            form.submit();
          }catch(e){
            finish(reject,e);
          }
        });
      }
      
      function renderDriveUploadFailures(){
        const box=$('driveUploadMissing');if(!box)return;
        const rows=Array.isArray(state.driveUploadFailures)?state.driveUploadFailures:[];
        if(!rows.length){box.classList.add('hidden');box.innerHTML='';return}
        box.classList.remove('hidden');
        box.innerHTML='<div style="font-weight:700;color:#8a5a00">⚠️ Ảnh chưa được xác nhận ('+rows.length+')</div><div style="margin-top:5px">Chỉ các ảnh dưới đây cần gửi lại:</div>';
        const ul=document.createElement('ol');ul.style.cssText='margin:6px 0 8px 20px;padding:0';
        rows.forEach((x,i)=>{const li=document.createElement('li');li.style.marginBottom='3px';li.textContent=(x.name||('Ảnh số '+(x.index+1)))+(x.error?' — '+x.error:'');ul.appendChild(li)});
        box.appendChild(ul);
        const b=document.createElement('button');b.type='button';b.className='btn light';b.textContent='↻ Gửi lại chỉ các ảnh chưa xác nhận';
        b.onclick=async()=>{b.disabled=true;try{await pti093UploadAll()}finally{b.disabled=false}};
        box.appendChild(b);
      }
      
      async function finalizeAfterSuccessfulDriveSave(){
        try{
          const cleaned=await finalizeCompletedSession();
          if(cleaned===false)throw new Error('Không dọn được nháp tự động.');
          return true;
        }catch(error){
          const detail=error&&error.message?error.message:String(error);
          setDriveState('Hồ sơ Drive đã lưu thành công, nhưng chưa dọn được nháp tự động: '+detail,false);
          msg('⚠️ Hồ sơ Drive đã lưu thành công. Nháp tự động chưa được dọn; hồ sơ Drive vẫn được giữ lại.',true);
          return false;
        }
      }

      async function createDriveRecord(){
        if(state.workspaceOpenPending||state.driveOpenPending||state.driveOpenIncomplete){
          const detail=driveWriteBlockedMessage();
          setDriveState(detail,false);msg(detail,true);return;
        }
        if(state.driveRecordId){try{const result=await pti093UploadAll();if(result&&result.failures&&result.failures.length)throw new Error('Còn ảnh chưa được xác nhận tải lên Drive.');state.localDraftId='';await saveProjectToDrive();const cleanupOk=await finalizeAfterSuccessfulDriveSave();if(cleanupOk)setDriveState('Hồ sơ đã được cập nhật trên Drive.');return}catch(e){msg('Lỗi cập nhật hồ sơ: '+e.message,true);return}}
        const btn=$('driveCreate');btn.disabled=true;setDriveState('Đang tạo hồ sơ và lưu dữ liệu...');
        try{
          const bks=($('bks').value||'').trim(),caseNumber=($('hoso').value||'').trim(),gdv=selectedGdv();
          const res=await fetch(PTI093_API+'?action=createRecord&bks='+encodeURIComponent(bks)+'&caseNumber='+encodeURIComponent(caseNumber)+'&gdv='+encodeURIComponent(gdv)+'&status='+encodeURIComponent('Đang xử lý'),{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
          const data=await res.json();if(!data.success)throw new Error(data.error||'API không tạo được hồ sơ');state.driveRecordId=data.recordId||'';state.localDraftId='';persistDriveRecordId(state.driveRecordId);
          $('driveId').textContent='Hồ sơ: '+state.driveRecordId;$('driveId').classList.remove('hidden');
          const result=await pti093UploadAll();if(!result||result.failures&&result.failures.length)throw new Error('Có ảnh chưa được xác nhận lưu lên Drive.');
          await saveProjectToDrive(false);const cleanupOk=await finalizeAfterSuccessfulDriveSave();if(cleanupOk){setDriveState('Đã tạo hồ sơ, lưu ảnh và lưu dữ liệu nháp.');msg('Đã tạo và lưu hồ sơ thành công. Có thể tìm lại theo Mã HS hoặc BKS.',true);}
        }catch(e){setDriveState('Chưa hoàn tất hồ sơ: '+e.message,false);msg('Lỗi lưu hồ sơ: '+e.message,true)}finally{btn.disabled=false}
      }
      
      async function pti093UploadAll(){
        if(state.driveOpenPending||state.driveOpenIncomplete){
          const detail=driveWriteBlockedMessage();
          setDriveState(detail,false);msg(detail,true);
          return {failures:[{index:0,name:'Hồ sơ Drive',error:detail}]};
        }
        const id=state.driveRecordId||readStoredDriveRecordId()||'';
        if(!id){
          setDriveState('Chưa có Record ID Drive.',false);
          msg('Chưa có Record ID Drive. Hãy bấm “Tạo hồ sơ Drive” trước.',true);
          return
        }
        window.__pti093_drive_record_id=id;
      
        const all=getAllGroups();
        const savedItems=all.flatMap(g=>g.items||[]);
        const currentItems=(state.current&&Array.isArray(state.current.items))?state.current.items:[];
        const items=[...savedItems,...currentItems];
        if(!items.length){
          setDriveState('Chưa có ảnh để gửi.',false);
          msg('Chưa có ảnh để gửi lên Drive.',true);
          return
        }
      
        const uploaded=getDriveUploadedKeys(id);
        const unique=[];
        const seen=new Set();
        for(const it of items){
          const key=driveImageKey(it);
          // Nếu ảnh đã có fileId/uploadKey từ project.pti thì chắc chắn đã được lưu.
          // Không gửi lại ảnh chỉ vì localStorage của trình duyệt đã mất trạng thái.
          if(!key || it.driveFileId || it.driveUploadKey || uploaded.has(key) || seen.has(key))continue;
          seen.add(key);
          unique.push({it,key});
        }
      
        if(!unique.length){
          setDriveState('Tất cả ảnh của hồ sơ này đã được gửi trước đó.');
          msg('Không có ảnh mới để gửi. Hồ sơ này đã được lưu các ảnh hiện có.',true);
          return
        }
      
        // Không còn nút upload riêng: upload được thực hiện trong "Tạo & lưu hồ sơ" và "Lưu thay đổi hồ sơ".
      
        // GHÉP ẢNH 093: giữ nguyên mốc đã kiểm nghiệm ở V24 — tối đa 5 ảnh đồng thời.
        // Vẫn đợi từng ảnh hoàn tất và chỉ tăng bộ đếm sau khi máy chủ xác nhận.
        let sent=0;
        const total=unique.length;
        const DRIVE_CONCURRENCY=5;
        const uploadStartedAt=performance.now();
        let failures=[];
        let prepTotalMs=0;
        let sendTotalMs=0;
      
        function updateUploadProgress(extra=''){
          const box=$('driveProgress');
          if(!box)return;
          box.classList.remove('hidden');
          const pct=total?Math.min(100,Math.round(sent*100/total)):100;
          $('driveProgressBar').style.width=pct+'%';
          $('driveProgressPct').textContent=pct+'%';
          $('driveProgressText').textContent='Đã xác nhận '+sent+'/'+total+' ảnh';
          const elapsed=Math.max(0,(performance.now()-uploadStartedAt)/1000);
          const speed=sent>0?(sent/elapsed).toFixed(2):'0.00';
          $('driveProgressMeta').textContent=(extra?extra+' · ':'')+'Thời gian '+elapsed.toFixed(1)+' giây · tốc độ xác nhận '+speed+' ảnh/giây';
        }
      
        try{
          updateUploadProgress('Đang bắt đầu');
      
          // V24: tối đa 5 ảnh cùng xử lý. Không fire-and-forget; mỗi ảnh vẫn phải xác nhận.
          for(let start=0;start<unique.length;start+=DRIVE_CONCURRENCY){
            const batch=unique.slice(start,start+DRIVE_CONCURRENCY);
            setDriveState('Đang xử lý '+Math.min(start+1,total)+'-'+Math.min(start+batch.length,total)+'/'+total+' ảnh · đã xác nhận '+sent+'/'+total+'...');
      
            const processOne=async(entry)=>{
              const itemStartedAt=performance.now();
              let prepMs=0;
              let sendMs=0;
              try{
                const prepStartedAt=performance.now();
                const prepared=await prepareDriveItem(entry.it,entry.offset,total);
                prepMs=performance.now()-prepStartedAt;
                prepTotalMs+=prepMs;
      
                const pending=entry.it.drivePendingUploadKey||getDrivePendingUploadKey(id,entry.key)||'';
                if(pending){
                  try{
                    const recovered=await waitForUploadStatus(id,pending);
                    if(recovered&&recovered.success&&recovered.found){
                      entry.it.driveFileId=recovered.fileId||entry.it.driveFileId||'';
                      entry.it.driveFileName=recovered.fileName||entry.it.driveFileName||((entry.it.file&&entry.it.file.name)||'');
                      entry.it.driveUploadKey=pending;
                      entry.it.drivePendingUploadKey='';
                      saveDrivePendingUploadKey(id,entry.key,'');
                      uploaded.add(prepared.key);
                      scheduleAutoDraftSave(false);
                      sent++;
                      saveDriveUploadedKeys(id,uploaded);
                      updateUploadProgress('Khôi phục xác nhận');
                      return {ok:true,recovered:true};
                    }
                  }catch(recoverError){}
                }
      
                entry.it.drivePendingUploadKey=prepared.uploadKey;
                saveDrivePendingUploadKey(id,entry.key,prepared.uploadKey);
                const sendStartedAt=performance.now();
                const result=await sendDrivePayload(prepared.payload,id,prepared.uploadKey);
                sendMs=performance.now()-sendStartedAt;
                sendTotalMs+=sendMs;
      
                entry.it.driveFileId=result&&result.fileId?result.fileId:(entry.it.driveFileId||'');
                entry.it.driveFileName=result&&result.fileName?result.fileName:((entry.it.file&&entry.it.file.name)||'');
                entry.it.driveUploadKey=prepared.uploadKey;
                entry.it.drivePendingUploadKey='';
                saveDrivePendingUploadKey(id,entry.key,'');
                uploaded.add(prepared.key);
                scheduleAutoDraftSave(false);
                sent++;
                saveDriveUploadedKeys(id,uploaded);
                updateUploadProgress(
                  (result&&result.duplicate?'Đã xác nhận ảnh đã có sẵn trên Drive':'Đã xác nhận trên Google Drive')
                  +' · ảnh '+(entry.offset+1)+': chuẩn bị '+(prepMs/1000).toFixed(1)+'s · gửi/xác nhận '+(sendMs/1000).toFixed(1)+'s'
                );
                return {ok:true};
              }catch(e){
                if(entry.it.drivePendingUploadKey)saveDrivePendingUploadKey(id,entry.key,entry.it.drivePendingUploadKey);
                const err=e&&e.message?e.message:String(e||'Gửi ảnh thất bại');
                failures.push({
                  key:entry.key,
                  name:(entry.it&&entry.it.file&&entry.it.file.name)||('Ảnh số '+(entry.offset+1)),
                  index:entry.offset,
                  error:err
                });
                updateUploadProgress('Có ảnh chưa xác nhận');
                return {ok:false,error:err};
              }
            };
      
            const entries=batch.map((x,j)=>({it:x.it,key:x.key,offset:start+j}));
            await Promise.all(entries.map(processOne));
            await new Promise(resolve=>setTimeout(resolve,0));
          }
      
      
          saveDriveUploadedKeys(id,uploaded);
          state.driveUploadFailures=failures.map(x=>({key:x.key||'',name:x.name||'Ảnh không xác định',index:Number.isFinite(x.index)?x.index:0,error:x.error||''}));
          renderDriveUploadFailures();
      
          if(failures.length===0&&sent===total){
            state.driveUploadFailures=[];renderDriveUploadFailures();
            setDriveState('Đã xác nhận đủ '+sent+'/'+total+' ảnh trên Google Drive.');
            msg('Đã xác nhận lưu đủ '+sent+'/'+total+' ảnh. Bộ đếm chỉ tăng sau khi máy chủ xác nhận.',true);
          }else{
            const remain=total-sent;
            setDriveState('Đã xác nhận '+sent+'/'+total+' ảnh. Còn '+remain+' ảnh chưa xác nhận.',false);
            msg('Đã xác nhận '+sent+'/'+total+' ảnh. Còn '+remain+' ảnh chưa xác nhận; bấm gửi lại để tiếp tục.',true);
          }
        }catch(e){
          saveDriveUploadedKeys(id,uploaded);
          if(!state.driveUploadFailures.length){
            state.driveUploadFailures=[{key:'',name:'Không xác định được tên ảnh',index:0,error:e.message||String(e)}];
          }
          renderDriveUploadFailures();
          const remain=total-sent;
          setDriveState('Đã xác nhận '+sent+'/'+total+' ảnh. Lỗi: '+e.message,false);
          msg('Đã xác nhận '+sent+'/'+total+' ảnh; còn '+remain+' ảnh chưa xác nhận: '+e.message,true);
        }finally{
          return {sent,total,failures};
        }
      }
      function bindControls(){
        global.pti093UploadAll=pti093UploadAll;
        $('driveSearchBtn').onclick=searchDriveRecords;
        $('driveSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchDriveRecords()});
        $('driveSaveProject').onclick=async()=>{
          const button=$('driveSaveProject');button.disabled=true;
          try{
            const result=await pti093UploadAll();
            if(result&&result.failures&&result.failures.length)throw new Error('Còn ảnh chưa được xác nhận tải lên Drive.');
            if(result&&result.total>result.sent)throw new Error('Chưa xác nhận đủ ảnh trên Drive.');
            state.localDraftId='';
            await saveProjectToDrive();
            const cleanupOk=await finalizeAfterSuccessfulDriveSave();
            if(cleanupOk)setDriveState('Đã lưu thay đổi hồ sơ. Ảnh hiện có đã được xác nhận trên Drive.');
          }catch(error){msg('Lỗi lưu thay đổi: '+error.message,true)}
          finally{button.disabled=false}
        };
        $('driveCreate').onclick=createDriveRecord;
      }
      return {openRecordFromDrive, recordMatchesQuery, recordTime, sameLocalDriveRecord, searchDriveRecords, saveProjectToDrive, driveImageKey, getDriveUploadedKeys, saveDriveUploadedKeys, getDrivePendingUploadKey, saveDrivePendingUploadKey, prepareDriveItem, waitForUploadStatus, sendDrivePayload, renderDriveUploadFailures, createDriveRecord, pti093UploadAll, finalizeAfterSuccessfulDriveSave, bindControls};
    }
  };
})(window);
