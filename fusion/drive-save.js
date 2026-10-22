(function(global){
  'use strict';
  global.PTI093DriveFusion = {
    install: function(deps){
      const {state, $, msg, setDriveState, optimizeDriveImage, snapshotGroupsForProject, buildProjectData, PTI093_API, DRIVE_CONCURRENCY} = deps;
      async function saveProjectToDrive(showMsg=true){
        const id=state.driveRecordId||sessionStorage.getItem('pti093_driveRecordId')||'';
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
      
      async function createDriveRecord(){
        if(state.driveRecordId){try{const result=await pti093UploadAll();if(result&&result.failures&&result.failures.length)throw new Error('Còn ảnh chưa được xác nhận tải lên Drive.');state.localDraftId='';await saveProjectToDrive();await finalizeCompletedSession();setDriveState('Hồ sơ đã được cập nhật trên Drive.');return}catch(e){msg('Lỗi cập nhật hồ sơ: '+e.message,true);return}}
        const btn=$('driveCreate');btn.disabled=true;setDriveState('Đang tạo hồ sơ và lưu dữ liệu...');
        try{
          const bks=($('bks').value||'').trim(),caseNumber=($('hoso').value||'').trim(),gdv=selectedGdv();
          const res=await fetch(PTI093_API+'?action=createRecord&bks='+encodeURIComponent(bks)+'&caseNumber='+encodeURIComponent(caseNumber)+'&gdv='+encodeURIComponent(gdv)+'&status='+encodeURIComponent('Đang xử lý'),{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
          const data=await res.json();if(!data.success)throw new Error(data.error||'API không tạo được hồ sơ');state.driveRecordId=data.recordId||'';state.localDraftId='';sessionStorage.setItem('pti093_driveRecordId',state.driveRecordId);localStorage.setItem('pti093_driveRecordId',state.driveRecordId);
          $('driveId').textContent='Hồ sơ: '+state.driveRecordId;$('driveId').classList.remove('hidden');
          const result=await pti093UploadAll();if(!result||result.failures&&result.failures.length)throw new Error('Có ảnh chưa được xác nhận lưu lên Drive.');
          await saveProjectToDrive(false);await finalizeCompletedSession();setDriveState('Đã tạo hồ sơ, lưu ảnh và lưu dữ liệu nháp.');msg('Đã tạo và lưu hồ sơ thành công. Có thể tìm lại theo Mã HS hoặc BKS.',true);
        }catch(e){setDriveState('Chưa hoàn tất hồ sơ: '+e.message,false);msg('Lỗi lưu hồ sơ: '+e.message,true)}finally{btn.disabled=false}
      }
      
      async function pti093UploadAll(){
        const id=state.driveRecordId||sessionStorage.getItem('pti093_driveRecordId')||'';
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
      
        // Skin PTI: kế thừa mốc đã kiểm nghiệm ở 093 V24 — tối đa 5 ảnh đồng thời.
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
      
          // V22: tối đa 3 ảnh cùng xử lý. Không fire-and-forget; mỗi ảnh vẫn phải xác nhận.
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
      return {saveProjectToDrive, driveImageKey, getDriveUploadedKeys, saveDriveUploadedKeys, getDrivePendingUploadKey, saveDrivePendingUploadKey, prepareDriveItem, waitForUploadStatus, sendDrivePayload, renderDriveUploadFailures, createDriveRecord, pti093UploadAll};
    }
  };
})(window);
