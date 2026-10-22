const assert = require('node:assert/strict');
const store = new Map();
global.window = global;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
require('../fusion/drive-save.js');
assert.ok(global.PTI093DriveFusion, 'Drive Fusion module should load');
const deps = {
  state: { groups: [], driveRecordId: '' },
  $: () => ({ textContent: '', style: {}, classList: { add(){}, remove(){} }, appendChild(){} }),
  msg: () => {},
  setDriveState: () => {},
  optimizeDriveImage: async file => ({ blob: file, fileName: file.name, mimeType: file.type }),
  snapshotGroupsForProject: () => [],
  buildProjectData: () => ({}),
  PTI093_API: 'https://example.invalid/api',
  DRIVE_CONCURRENCY: 5
};
const api = global.PTI093DriveFusion.install(deps);
for (const name of ['saveProjectToDrive','driveImageKey','getDriveUploadedKeys','saveDriveUploadedKeys','getDrivePendingUploadKey','saveDrivePendingUploadKey','prepareDriveItem','waitForUploadStatus','sendDrivePayload','renderDriveUploadFailures','createDriveRecord','pti093UploadAll']) {
  assert.equal(typeof api[name], 'function', name + ' should be exported');
}
const file = { name: 'damage.jpg', size: 1200, lastModified: 99, webkitRelativePath: '' };
assert.equal(api.driveImageKey({ file }), 'damage.jpg|1200|99|');
api.saveDriveUploadedKeys('case-1', new Set(['img-a','img-b']));
assert.deepEqual([...api.getDriveUploadedKeys('case-1')].sort(), ['img-a','img-b']);
api.saveDrivePendingUploadKey('case-1', 'img-a', 'upload-123');
assert.equal(api.getDrivePendingUploadKey('case-1','img-a'), 'upload-123');
api.saveDrivePendingUploadKey('case-1', 'img-a', '');
assert.equal(api.getDrivePendingUploadKey('case-1','img-a'), '');

const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.includes('<link rel="stylesheet" href="./css/skin-classic.css">'), 'Classic skin should be external');
assert.ok(html.includes('<link rel="stylesheet" id="uiRefreshV42" href="./css/skin-modern.css">'), 'Modern skin toggle target should remain addressable');
assert.ok(html.indexOf('window.PTI093DriveFusion.install') < html.indexOf("$('driveSaveProject').onclick=async()=>{"), 'Drive handlers must bind after module installation');
assert.ok(html.indexOf('window.PTI093DriveFusion.install') < html.indexOf("$('driveCreate').onclick=createDriveRecord;"), 'Create handler must bind after module installation');
for (const marker of ['pti093_local_drafts_v1', 'async function restoreAutoDraft', 'async function saveAutoDraft']) {
  assert.ok(html.includes(marker), 'Existing 093 draft-recovery code must remain: ' + marker);
}

console.log('093 Drive Fusion tests passed (source contract + storage helpers).');
