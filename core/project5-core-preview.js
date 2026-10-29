(function(root){
  'use strict';
  const enabled = new URLSearchParams(root.location.search).get('corePreview') === '1';
  root.PROJECT5_CORE_PREVIEW = enabled;
  if (enabled && root.document && root.document.documentElement) {
    root.document.documentElement.classList.add('project5-core-preview');
    root.document.title = 'Project 5 – Core Preview (Classic)';
  }
})(window);
