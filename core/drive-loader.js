(function(root, doc){
  'use strict';
  // Preserve the original synchronous load order for the normal 093 app.
  // The isolated Core Preview does not load the Drive module at all.
  if (root.PROJECT5_CORE_PREVIEW === true) return;
  doc.write('<script src="./fusion/drive.js"><' + '/script>');
})(window, document);
