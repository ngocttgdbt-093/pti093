(function(root, doc){
  'use strict';
  const enabled = new URLSearchParams(root.location.search).get('corePreview') === '1';
  root.PROJECT5_CORE_PREVIEW = enabled;
  if (!enabled || !doc || !doc.documentElement) return;
  doc.documentElement.classList.add('project5-core-preview');
  doc.title = 'Project 5 – Core Preview (Modern UI)';
  // This isolated acceptance preview should exercise the new interface, without changing normal 093 defaults.
  try {
    if (root.localStorage.getItem('project5_core_preview_ui_default_v1') !== '1') {
      root.localStorage.setItem('pti093_ui_default_classic_v2', '1');
      root.localStorage.setItem('pti093_ui_mode', 'modern');
      root.localStorage.setItem('project5_core_preview_ui_default_v1', '1');
    }
  } catch (e) { /* the UI mode toggle still works in memory if storage is blocked */ }
})(window, document);
