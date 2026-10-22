(function(global){
  'use strict';
  global.PTI093FileNaming = {
    install: function(deps){
      const {getAllGroups,$,selectedGdv}=deps;
      function fileBaseName(name){return String(name||'').replace(/\.[^.]+$/, '');}
      function gdvShortName(name){
        if(!name)return '';
        const map={'Nguyễn Minh Ngọc':'NMN','Đặng Xuân Linh':'DXL','Đặng Xuân Diệu':'DXD','Đặng Văn Hiên':'DVH','Phạm Duy Thái':'PDT','Nguyễn Tuấn Hưng':'NTH'};
        return map[name]||((name||'').trim().split(/\s+/).filter(Boolean).map(w=>w[0]).join('').toUpperCase()||'');
      }
      function pdfFileName(){
        const groups=getAllGroups(),bks=(($('bks').value||'').trim()).replace(/[^\w.-]+/g,'_'),gdvCode=gdvShortName(selectedGdv());
        let prefix='Anh giam dinh';
        if(groups.length===1){
          if(groups[0].title==='Bản ảnh hiện trường')prefix='Anh hien truong';
          else if(groups[0].title==='Giấy tờ có liên quan')prefix='Anh giay to';
        }
        return `${prefix}${bks ? ' ' + bks : ''}${gdvCode ? ' ' + gdvCode : ''}.pdf`;
      }
      return {fileBaseName,gdvShortName,pdfFileName};
    }
  };
})(typeof window!=='undefined'?window:globalThis);
