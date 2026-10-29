const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const refs=[...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(m=>m[1]);
const missing=[...new Set(refs.filter(ref=>!fs.existsSync(path.resolve(process.cwd(),ref))))];
assert.deepEqual(missing,[],'Every local src/href reference in index.html must resolve to a repository file');
assert.equal(new Set(refs).size,refs.length,'index.html should not duplicate local src/href references');
const inlineScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([,attrs,source])=>!/\bsrc\s*=/i.test(attrs)&&source.trim());
assert.equal(inlineScripts.length,0,'Application JavaScript should remain in external modules');
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/gi)].map(m=>m[1]);
const position=src=>scripts.indexOf(src);
assert.ok(position('./core/local-draft-store.js')>=0,'IndexedDB store adapter must be loaded');
assert.ok(position('./core/draft-recovery.js')>position('./core/local-draft-store.js'),
  'Draft Recovery must load after the IndexedDB store adapter');
assert.ok(position('./core/project5-core-preview.js')<position('./core/app-core.js'),
  'Core Preview mode must be defined before the App Core composition root runs');
assert.ok(position('./core/drive-loader.js')<position('./core/app-core.js'),
  'Conditional Drive loader must run before the App Core composition root');
assert.ok(fs.readFileSync('core/drive-loader.js','utf8').includes('./fusion/drive.js'),
  'Normal app startup must retain the existing 093 Drive adapter');
for(const module of [
  './core/gdv-search.js','./core/workspace.js','./core/group-workflow.js',
  './core/file-delivery.js','./core/drive-loader.js','./core/project5-core-preview.js','./core/pdf-builder.js','./core/image-canvas.js',
  './core/preview-builder.js','./core/session-actions.js','./core/device-context.js',
  './core/local-save.js','./core/local-open.js','./fusion/gdv-093.js',
  './core/date-utils.js','./core/file-naming.js','./core/image-ingest.js',
  './core/image-editing.js','./core/case-editor.js','./core/image-reorder.js',
  './core/pdf-export.js','./core/pdf-export-controller.js',
  './skin/classic-local-save.js','./skin/classic-load-progress.js',
  './skin/classic-image-viewer.js','./skin/classic-status.js','./skin/classic-layout.js',
  './skin/classic-group-list.js','./skin/classic-image-grid.js','./skin/classic-pdf-warning.js',
  './skin/classic-preview.js','./skin/classic-file-intake.js'
]){
  assert.ok(position(module)>=0,module+' must be present in the application load order');
  assert.ok(position(module)<position('./core/app-core.js'),
    module+' must be defined before the App Core composition root initializes');
}
for(const lateModule of ['./skin/ui-mode-toggle.js','./skin/modern-image-gallery.js','./skin/preview-modal.js','./fusion/drive-recovery-guard.js']){
  assert.ok(position(lateModule)>position('./core/app-core.js'),
    lateModule+' must run after App Core has initialized');
}
assert.equal(scripts.some(src=>/docx-builder|zip-utils/i.test(src)),false,
  'Retired DOCX/ZIP draft modules must not return to the application load path');
console.log('Core/Fusion/Skin load-order contract passed ('+scripts.length+' external modules; dependencies before composition root; late patches after initialization).');
console.log('Local asset reference audit passed ('+refs.length+' references; no missing/duplicate references; zero inline scripts).');
