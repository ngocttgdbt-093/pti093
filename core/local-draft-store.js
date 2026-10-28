(function(global){
  'use strict';
  global.PTILocalDraftStore = {
    install: function(options){
      const PTI093_LOCAL_DB = options.dbName;
      function openLocalDraftDB(){
        return new Promise((resolve,reject)=>{
          if(!('indexedDB' in window)){reject(new Error('Trình duyệt không hỗ trợ lưu nháp tại máy.'));return}
          const req=indexedDB.open(PTI093_LOCAL_DB,1);
          req.onupgradeneeded=()=>{
            const db=req.result;
            if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts',{keyPath:'id'});
            if(!db.objectStoreNames.contains('draftImages')){
              const st=db.createObjectStore('draftImages',{keyPath:'id'});
              st.createIndex('draftId','draftId',{unique:false});
            }
          };
          req.onsuccess=()=>resolve(req.result);
          req.onerror=()=>reject(req.error||new Error('Không mở được kho lưu nháp tại máy.'));
        });
      }
      
      function localDraftTransactionDone(tx){
        return new Promise((resolve,reject)=>{
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('Lỗi giao dịch lưu nháp.'));
          tx.onabort=()=>reject(tx.error||new Error('Giao dịch lưu nháp bị hủy.'));
        });
      }
      
      async function getLocalDraftBundles(ids){
        if(!Array.isArray(ids)||!ids.length||ids.some(id=>id===undefined||id===null||String(id)===''))throw new TypeError('A non-empty array of draft IDs is required.');
        const uniqueIds=[...new Set(ids.map(String))];
        const db=await openLocalDraftDB();
        try{
          return await new Promise((resolve,reject)=>{
            const tx=db.transaction(['drafts','draftImages'],'readonly');
            const drafts=tx.objectStore('drafts'),imageIndex=tx.objectStore('draftImages');
            const result={};let pending=uniqueIds.length*2,transactionComplete=false,settled=false;
            const finish=()=>{if(!settled&&transactionComplete&&pending===0){settled=true;resolve(result)}};
            const fail=error=>{if(!settled){settled=true;reject(error)}};
            uniqueIds.forEach(id=>{
              result[id]={meta:null,images:[]};
              const metaRequest=drafts.get(id),imagesRequest=imageIndex.index('draftId').getAll(IDBKeyRange.only(id));
              metaRequest.onsuccess=()=>{result[id].meta=metaRequest.result||null;pending--;finish()};
              imagesRequest.onsuccess=()=>{result[id].images=imagesRequest.result||[];pending--;finish()};
              metaRequest.onerror=()=>fail(metaRequest.error||new Error('Không đọc được metadata của bản nháp '+id+'.'));
              imagesRequest.onerror=()=>fail(imagesRequest.error||new Error('Không đọc được ảnh của bản nháp '+id+'.'));
            });
            tx.oncomplete=()=>{transactionComplete=true;finish()};
            tx.onerror=()=>fail(tx.error||new Error('Lỗi giao dịch đọc nhiều bản nháp.'));
            tx.onabort=()=>fail(tx.error||new Error('Giao dịch đọc nhiều bản nháp bị hủy.'));
          });
        }finally{db.close()}
      }

      async function writeLocalDraftMetadata(meta){
        if(!meta||!meta.id)throw new TypeError('Draft metadata must include a non-empty id.');
        const db=await openLocalDraftDB();
        try{
          await new Promise((resolve,reject)=>{
            const tx=db.transaction('drafts','readwrite');let settled=false;
            tx.objectStore('drafts').put(meta);
            tx.oncomplete=()=>{if(!settled){settled=true;resolve()}};
            tx.onerror=()=>{if(!settled){settled=true;reject(tx.error||new Error('Lỗi cập nhật metadata bản nháp.'))}};
            tx.onabort=()=>{if(!settled){settled=true;reject(tx.error||new Error('Giao dịch cập nhật metadata bị hủy.'))}};
          });
        }finally{db.close()}
      }

      async function deleteLocalDraftBundle(id){
        if(id===undefined||id===null||String(id)==='')throw new TypeError('A non-empty draft ID is required.');
        const db=await openLocalDraftDB();
        try{
          await new Promise((resolve,reject)=>{
            const tx=db.transaction(['drafts','draftImages'],'readwrite');let settled=false;
            tx.objectStore('drafts').delete(String(id));
            const req=tx.objectStore('draftImages').index('draftId').openCursor(IDBKeyRange.only(String(id)));
            req.onsuccess=()=>{const cursor=req.result;if(cursor){cursor.delete();cursor.continue()}};
            req.onerror=()=>{if(!settled){settled=true;reject(req.error||new Error('Không thể xóa ảnh của bản nháp.'))}};
            tx.oncomplete=()=>{if(!settled){settled=true;resolve()}};
            tx.onerror=()=>{if(!settled){settled=true;reject(tx.error||new Error('Lỗi xóa bản nháp.'))}};
            tx.onabort=()=>{if(!settled){settled=true;reject(tx.error||new Error('Giao dịch xóa bản nháp bị hủy.'))}};
          });
        }finally{db.close()}
      }

      async function writeLocalDraftBundle(meta, imageRecords, onProgress){
        if(!meta||!meta.id)throw new TypeError('Draft metadata must include a non-empty id.');
        if(!Array.isArray(imageRecords))throw new TypeError('Draft images must be an array.');
        const db=await openLocalDraftDB();
        try{
          await new Promise((resolve,reject)=>{
            let settled=false;
            const tx=db.transaction(['drafts','draftImages'],'readwrite');
            const fail=error=>{if(!settled){settled=true;reject(error)}};
            tx.objectStore('drafts').put(meta);
            const images=tx.objectStore('draftImages');
            const cursorRequest=images.index('draftId').openCursor(IDBKeyRange.only(meta.id));
            cursorRequest.onsuccess=()=>{
              const cursor=cursorRequest.result;
              if(cursor){cursor.delete();cursor.continue();return;}
              try{
                if(typeof onProgress==='function')onProgress();
                imageRecords.forEach(record=>images.put(record));
              }catch(error){try{tx.abort()}catch(e){}fail(error);}
            };
            cursorRequest.onerror=()=>fail(cursorRequest.error||new Error('Không thể thay thế ảnh của bản lưu tại máy.'));
            tx.oncomplete=()=>{if(!settled){settled=true;resolve()}};
            tx.onerror=()=>fail(tx.error||new Error('Lỗi giao dịch ghi bản lưu tại máy.'));
            tx.onabort=()=>fail(tx.error||new Error('Giao dịch ghi bản lưu tại máy bị hủy.'));
          });
        }finally{db.close()}
      }

      async function getLocalDrafts(){
        const db=await openLocalDraftDB();
        try{
          return await new Promise((resolve,reject)=>{
            const req=db.transaction('drafts','readonly').objectStore('drafts').getAll();
            req.onsuccess=()=>resolve(req.result||[]);
            req.onerror=()=>reject(req.error||new Error('Không đọc được danh sách nháp tại máy.'));
          });
        }finally{db.close()}
      }

      // Read metadata and image blobs in one readonly transaction so opening a draft
      // cannot combine metadata from one commit with images from another commit.
      async function getLocalDraftBundle(id){
        const db=await openLocalDraftDB();
        try{
          return await new Promise((resolve,reject)=>{
            let metaReady=false,imagesReady=false,transactionComplete=false,settled=false,meta,images;
            const tx=db.transaction(['drafts','draftImages'],'readonly');
            const metaRequest=tx.objectStore('drafts').get(id);
            const imageRequest=tx.objectStore('draftImages').index('draftId').getAll(IDBKeyRange.only(id));
            const finish=()=>{
              if(!settled&&transactionComplete&&metaReady&&imagesReady){
                settled=true;resolve({meta:meta||null,images:images||[]});
              }
            };
            const fail=error=>{if(!settled){settled=true;reject(error)}};
            metaRequest.onsuccess=()=>{meta=metaRequest.result;metaReady=true;finish()};
            imageRequest.onsuccess=()=>{images=imageRequest.result;imagesReady=true;finish()};
            metaRequest.onerror=()=>fail(metaRequest.error||new Error('Không đọc được thông tin bản lưu tại máy.'));
            imageRequest.onerror=()=>fail(imageRequest.error||new Error('Không đọc được ảnh của bản lưu tại máy.'));
            tx.oncomplete=()=>{transactionComplete=true;finish()};
            tx.onerror=()=>fail(tx.error||new Error('Lỗi khi đọc bản lưu tại máy.'));
            tx.onabort=()=>fail(tx.error||new Error('Giao dịch đọc bản lưu tại máy bị hủy.'));
          });
        }finally{db.close()}
      }
      return {openLocalDraftDB, localDraftTransactionDone, getLocalDrafts, getLocalDraftBundle, getLocalDraftBundles, writeLocalDraftBundle, writeLocalDraftMetadata, deleteLocalDraftBundle};
    }
  };

  // Stable Core-facing storage contract. App-specific persistence stays behind this adapter.
  global.PTIDraftStorageContract = {
    install: function(options){
      const provider=options&&options.provider;
      if(!provider||typeof provider.getLocalDraftBundle!=='function'||typeof provider.getLocalDraftBundles!=='function'||
        typeof provider.writeLocalDraftBundle!=='function'||
        typeof provider.writeLocalDraftMetadata!=='function'||
        typeof provider.deleteLocalDraftBundle!=='function'){
        throw new TypeError('Draft storage provider must implement getLocalDraftBundle(id), getLocalDraftBundles(ids), writeLocalDraftBundle(meta, images), writeLocalDraftMetadata(meta), and deleteLocalDraftBundle(id).');
      }
      async function readBundles(ids){
        if(!Array.isArray(ids)||!ids.length||ids.some(id=>id===undefined||id===null||String(id)===''))throw new TypeError('A non-empty array of draft IDs is required.');
        const result=await provider.getLocalDraftBundles(ids.map(String));
        if(!result||typeof result!=='object')throw new Error('Draft storage returned an invalid bundle collection.');
        for(const id of new Set(ids.map(String))){if(!result[id]||!Array.isArray(result[id].images))throw new Error('Draft storage returned an invalid bundle for '+id+'.')}
        return result;
      }
      async function writeMetadata(meta){
        if(!meta||!meta.id)throw new TypeError('Draft metadata must include a non-empty id.');
        if(typeof provider.writeLocalDraftMetadata!=='function')throw new TypeError('Draft storage provider must implement writeLocalDraftMetadata(meta).');
        return provider.writeLocalDraftMetadata(meta);
      }
      async function deleteBundle(id){
        if(id===undefined||id===null||String(id)==='')throw new TypeError('A non-empty draft ID is required.');
        if(typeof provider.deleteLocalDraftBundle!=='function')throw new TypeError('Draft storage provider must implement deleteLocalDraftBundle(id).');
        return provider.deleteLocalDraftBundle(String(id));
      }
      async function writeBundle(meta, images, onProgress){
        if(!meta||!meta.id)throw new TypeError('Draft metadata must include a non-empty id.');
        if(!Array.isArray(images))throw new TypeError('Draft images must be an array.');
        if(images.some(image=>!image||image.draftId!==meta.id))throw new TypeError('Every draft image must match the metadata id.');
        if(typeof provider.writeLocalDraftBundle!=='function')throw new TypeError('Draft storage provider must implement writeLocalDraftBundle(meta, images).');
        return provider.writeLocalDraftBundle(meta,images,onProgress);
      }
      async function readBundle(id){
        if(id===undefined||id===null||String(id)==='')throw new TypeError('A non-empty draft ID is required.');
        const result=await provider.getLocalDraftBundle(String(id));
        if(!result||!Array.isArray(result.images))throw new Error('Draft storage returned an invalid bundle.');
        return {meta:result.meta||null,images:result.images};
      }
      return {readBundle,readBundles,writeBundle,writeMetadata,deleteBundle};
    }
  };
})(window);
