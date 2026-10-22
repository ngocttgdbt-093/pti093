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
const api = global.PTI093DraftRecovery.install(deps);
for (const name of [
  'openLocalDraftDB', 'localDraftTransactionDone', 'getLocalDrafts',
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
assert.ok(html.includes('src="./core/draft-recovery.js"'), 'index.html should load the shared draft Core module');
for (const marker of [
  'pti093_local_drafts_v1', 'AUTO-DRAFT', 'async function saveAutoDraft',
  'async function restoreAutoDraft', 'async function clearAutoDraft',
  'async function finalizeCompletedSession'
]) {
  assert.ok(source.includes(marker), 'Draft lifecycle contract should remain: ' + marker);
}
console.log('Shared Core draft-recovery tests passed (module API + session contract).');
