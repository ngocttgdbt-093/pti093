(function(global){
  'use strict';
  function normalizeRecordSearch(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[\s.-]/g,'').trim();
  }
  function gdvInitials(name){
    return String(name||'').trim().split(/\s+/).map(word=>normalizeRecordSearch(word).replace(/[^a-z0-9]/g,'')).filter(Boolean).map(word=>word[0]).join('');
  }
  function gdvSearchMatches(query,name){
    const q=normalizeRecordSearch(query),n=normalizeRecordSearch(name);
    if(!q||!n)return false;
    const initials=gdvInitials(name);
    return n.includes(q)||initials.includes(q)||q===initials;
  }
  function searchQueryVariants(query,names){
    const q=String(query||'').trim(),nq=normalizeRecordSearch(q),out=[q];
    for(const name of (names||[])){
      if(gdvSearchMatches(q,name)){
        if(!out.some(x=>normalizeRecordSearch(x)===normalizeRecordSearch(name)))out.push(name);
        const surname=name.trim().split(/\s+/).slice(-1)[0];
        if(!out.some(x=>normalizeRecordSearch(x)===normalizeRecordSearch(surname)))out.push(surname);
      }
      if(nq===normalizeRecordSearch(name)||normalizeRecordSearch(name).includes(nq)){
        const initials=gdvInitials(name);
        if(initials&&!out.some(x=>normalizeRecordSearch(x)===initials))out.push(initials);
      }
    }
    return [...new Set(out.filter(Boolean))].slice(0,5);
  }
  global.PTISharedCore=Object.assign(global.PTISharedCore||{},{
    normalizeRecordSearch,
    gdvInitials,
    gdvSearchMatches,
    searchQueryVariants
  });
})(window);
