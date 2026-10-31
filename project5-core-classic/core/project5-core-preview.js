(function(root, doc){
  'use strict';
  const enabled = new URLSearchParams(root.location.search).get('corePreview') === '1';
  root.PROJECT5_CORE_PREVIEW = enabled;
  if (!enabled || !doc || !doc.documentElement) return;
  doc.documentElement.classList.add('project5-core-preview');
  doc.title = 'Project 5 – Core Preview (Classic Skin)';
  // This isolated acceptance preview is locked to Classic Skin; it does not expose the Modern UI toggle.
  try {
    root.localStorage.setItem('pti093_ui_default_classic_v2', '1');
    root.localStorage.setItem('pti093_ui_mode', 'classic');
    root.localStorage.setItem('project5_core_preview_ui_default_v1', '1');
  } catch (e) { /* Classic Skin is the only stylesheet loaded by this preview */ }
})(window, document);
