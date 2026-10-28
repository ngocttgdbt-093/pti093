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
      return {openLocalDraftDB, localDraftTransactionDone, getLocalDrafts};
    }
  };
})(window);
