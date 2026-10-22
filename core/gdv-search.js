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
  global.PTISharedCore=Object.assign(global.PTISharedCore||{},{
    normalizeRecordSearch,
    gdvInitials,
    gdvSearchMatches
  });
})(window);
