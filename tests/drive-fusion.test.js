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
console.log('093 Drive Fusion tests passed (17 assertions/checks).');
