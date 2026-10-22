const assert = require('node:assert/strict');
const store = new Map();
global.window = global;
global.sessionStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
global.localStorage = {
  getItem: key => store.has('local:' + key) ? store.get('local:' + key) : null,
  setItem: (key, value) => store.set('local:' + key, String(value)),
  removeItem: key => store.delete('local:' + key)
};
require('../core/local-draft-store.js');
require('../core/draft-recovery.js');
assert.ok(global.PTI093DraftRecovery, 'Draft Recovery Core module should load');

const deps = {
  state: {
    groups: [], current: { title: 'Bản ảnh chi tiết thiệt hại', items: [] },
    editing: -1, pages: [], pageDefs: [], driveRecordId: '', localDraftId: '',
    orientation: 'portrait', per: 6, addSeq: 0
  },
  $: () => ({
    value: '', textContent: '', dataset: {}, options: [],
    classList: { add(){}, remove(){}, toggle(){} }
  }),
  getDateISO: () => '2026-10-22',
  setDateInput: () => {},
  render: () => {},
  renderLayout: () => {},
  setDriveState: () => {},
  msg: () => {}
};
const storeApi = global.PTILocalDraftStore.install({dbName: 'pti093_local_drafts_v1'});
const api = global.PTI093DraftRecovery.install({...deps, ...storeApi});
for (const name of [
  'scheduleAutoDraftSave', 'saveAutoDraft', 'finalizeCompletedSession',
  'clearAutoDraft', 'restoreAutoDraft', 'clearAutoDraftTimer'
]) {
  assert.equal(typeof api[name], 'function', name + ' should be exported');
}
assert.equal(store.get('pti093_work_session_id') !== undefined, true, 'A session ID should be persisted in sessionStorage');
assert.ok(store.get('pti093_work_session_id'), 'The persisted session ID should be non-empty');
assert.ok(api.restoreAutoDraft instanceof Function, 'Restore API should remain callable');
assert.ok(api.saveAutoDraft instanceof Function, 'Autosave API should remain callable');

const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('core/draft-recovery.js', 'utf8');
const storeSource = fs.readFileSync('core/local-draft-store.js', 'utf8');
assert.ok(html.includes('src="./core/draft-recovery.js"'), 'index.html should load the shared draft Core module');
for (const marker of [
  'AUTO-DRAFT', 'async function saveAutoDraft',
  'async function restoreAutoDraft', 'async function clearAutoDraft',
  'async function finalizeCompletedSession'
]) {
  assert.ok(source.includes(marker), 'Draft lifecycle contract should remain: ' + marker);
}
assert.ok(storeSource.includes('pti093_local_drafts_v1') === false, 'DB name should be supplied through the store adapter configuration');
assert.ok(typeof storeApi.openLocalDraftDB === 'function' && typeof storeApi.localDraftTransactionDone === 'function' && typeof storeApi.getLocalDrafts === 'function', 'Local Draft Store should export storage APIs');
console.log('Shared Core draft-recovery tests passed (module API + session contract).');


// Integration contract: the app must initialize the extracted modules in dependency order
// and keep the existing autosave/reload lifecycle wired to the extracted API.
const appCore = fs.readFileSync('core/app-core.js', 'utf8');
const moduleScripts = [
  './core/local-draft-store.js',
  './core/draft-recovery.js',
  './core/local-save.js',
  './core/local-open.js',
  './fusion/drive.js'
];
const scriptPositions = moduleScripts.map(src => html.indexOf('src="' + src + '"'));
assert.ok(scriptPositions.every(pos => pos >= 0), 'index.html should load every extracted storage/Core/Fusion module');
assert.ok(scriptPositions.every((pos, i) => i === 0 || pos > scriptPositions[i - 1]), 'Store, recovery, local save/open, and Drive Fusion scripts must load in dependency order');
const builderScripts = [
  './core/file-delivery.js',
  './core/pdf-builder.js',
  './core/image-canvas.js',
  './core/preview-builder.js',
  './core/pdf-export.js',
  './core/pdf-export-controller.js',
  './skin/classic-preview.js',
  './core/app-core.js'
];
const builderPositions = builderScripts.map(src => html.indexOf('src="' + src + '"'));
assert.ok(builderPositions.every(pos => pos >= 0), 'index.html should load every extracted builder/controller module');
assert.ok(builderPositions.every((pos, i) => i === 0 || pos > builderPositions[i - 1]), 'Shared builders must load before app-core.js in dependency order');
for (const contract of [
  "window.PTILocalDraftStore.install({dbName:'pti093_local_drafts_v1'})",
  'window.PTI093DraftRecovery.install(',
  'window.PTILocalSaveCore.install(',
  'window.PTI093LocalOpenCore.install(',
  'window.PTI093DriveFusion.install(',
  'const {scheduleAutoDraftSave,saveAutoDraft,finalizeCompletedSession,clearAutoDraft,restoreAutoDraft,clearAutoDraftTimer}=draftRecovery',
  "document.addEventListener('visibilitychange'",
  "window.addEventListener('pagehide'"
]) {
  assert.ok(appCore.includes(contract), 'App integration contract should remain: ' + contract);
}
assert.ok(source.includes("const PTI093_SESSION_KEY='pti093_work_session_id'"), 'The session key must remain stable');
assert.ok(source.includes("const PTI093_AUTO_DRAFT_ID='AUTO-DRAFT'"), 'The automatic draft ID must remain stable');
console.log('Draft-recovery integration wiring contract passed.');

assert.ok(!html.includes('docx-builder.js') && !html.includes('zip-utils.js'), 'Retired DOCX draft and ZIP utility modules must not load');
assert.ok(!appCore.includes('saveDocx') && !appCore.includes('openDocxFile') && !appCore.includes('PTI093DocxBuilder'), 'The app Core must not retain the retired Word draft workflow');
console.log('Retired DOCX draft path removal contract passed.');
