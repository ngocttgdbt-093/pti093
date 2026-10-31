(function(root, doc){
  'use strict';
  // This file is served only from the isolated Project 5 preview directory; enable its Core-only guards on every visit.
  const enabled = true;
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
