const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '../core/host-093-assembly.js'), 'utf8');
let gdvArgs, driveArgs, bindCount = 0;
const window = {
  PTI093GdvFusion: { install(args) { gdvArgs = args; return { names: ['GĐV 093'], selectedGdv: () => 'GĐV 093' }; } },
  PTI093DriveFusion: { install(args) { driveArgs = args; return { bindControls() { bindCount++; } }; } }
};
vm.runInNewContext(source, { window });
assert.equal(typeof window.PTI093HostAssembly.installGdv, 'function');
assert.equal(typeof window.PTI093HostAssembly.installDrive, 'function');
const state = { groups: [] }, dollar = () => null, storage = { getItem() {} };
const gdv = window.PTI093HostAssembly.installGdv({ window, $, prompt: () => null, storage, state });
function $(id) { return dollar(id); }
assert.equal(gdv.names[0], 'GĐV 093');
assert.equal(gdvArgs.state, state);
assert.equal(gdvArgs.storage, storage);
const keys = ['msg','setDriveState','setOpenLoad','finishOpenLoad','getAllGroups','snapshotGroupsForProject','selectedGdv','scheduleAutoDraftSave','finalizeCompletedSession','getDateISO','setDateInput','render','renderLayout','deviceStorageLabel','searchQueryVariants','getLocalDrafts','openLocalDraft','normalizeRecordSearch','gdvSearchMatches','gdvInitials','wrap'];
const deps = { window, state, $ };
for (const key of keys) deps[key] = () => key;
const drive = window.PTI093HostAssembly.installDrive(deps);
assert.equal(bindCount, 1, 'Drive controls bind exactly once');
assert.equal(driveArgs.state, state);
for (const key of keys) assert.equal(driveArgs[key], deps[key], 'dependency forwarded: ' + key);
assert.equal(typeof drive.bindControls, 'function');
assert.throws(() => window.PTI093HostAssembly.installGdv({ window: {} }), /PTI093GdvFusion/);
assert.throws(() => window.PTI093HostAssembly.installDrive({ window: {} }), /PTI093DriveFusion/);
console.log('PASS: 093 host assembly forwards existing GDV/Drive adapters and binds Drive controls once.');
