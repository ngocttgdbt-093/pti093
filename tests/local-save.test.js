const assert = require('node:assert/strict');
global.window = global;
require('../core/local-save.js');
assert.ok(global.PTILocalSaveCore, 'Local-save Core module should load');
const noop = () => {};
const state = { groups: [], current: { title: 'Thiệt hại', items: [] }, localDraftId: '', driveRecordId: '' };
const deps = {
  state,
  $: () => ({ value: '', textContent: '', disabled: false, style: {}, classList: { add(){}, remove(){} } }),
  snapshotGroupsForProject: () => [],
  openLocalDraftDB: async () => { throw new Error('not called in API contract test'); },
  localDraftTransactionDone: async () => {},
  getDateISO: () => '2026-10-22',
  selectedGdv: () => 'GĐV test',
  setDriveState: noop,
  msg: noop,
  renderLocalSaveFeedback: noop,
  showLocalSaveConfirm: async () => false,
  clearAutoDraft: async () => {}
};
const api = global.PTILocalSaveCore.install(deps);
assert.equal(typeof api.saveLocalDraft, 'function');
assert.equal(typeof api.saveDraftWithoutPhotos, 'function');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('core/local-save.js', 'utf8');
assert.ok(html.includes('src="./core/local-save.js"'), 'index.html should load the local-save Core module');
assert.ok(html.includes('PTILocalSaveCore.install'), 'App should install the local-save Core module');
assert.ok(!html.includes('async function saveLocalDraft('), 'Manual local-save should be outside index.html');
assert.ok(!html.includes('async function saveDraftWithoutPhotos('), 'Local draft button orchestration should be outside index.html');
for (const forbidden of ['PTI093_API', 'pti093UploadAll(', 'saveProjectToDrive(']) {
  assert.ok(!source.includes(forbidden), 'Local-save Core must not invoke Drive case saving: ' + forbidden);
}
assert.ok(source.includes("storageType:'local'"), 'Local save should retain the local storage type');
console.log('Shared Core local-save tests passed (API and Drive-isolation contract).');
