(function(root, doc){
  'use strict';
  // During normal app startup, synchronously load the legacy 093 Drive adapter in its original position.
  // Core Preview deliberately does not load the Drive module at all.
  if (root.PROJECT5_CORE_PREVIEW === true) return;
  doc.write('<script src="./fusion/drive.js"><\\/script>');
})(window, document);
