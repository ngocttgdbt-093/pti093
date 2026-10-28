const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const coreDir = path.join(root, 'core');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const coreFiles = fs.readdirSync(coreDir)
  .filter(name => name.endsWith('.js') && name !== 'app-core.js')
  .map(name => ({ name, source: fs.readFileSync(path.join(coreDir, name), 'utf8') }));

// These names belong to app-specific composition/integration layers, not reusable Core modules.
const forbiddenCoreIntegrations = [
  ['Drive Fusion global', /PTI093DriveFusion/],
  ['093 GĐV Fusion global', /PTI093GdvFusion/],
  ['PTI GĐV Admin API', /PTI_GDV_ADMIN_API_URL/],
  ['Drive handoff frontend module', /DriveStorage093/],
  ['Drive Fusion script path', /fusion\\/drive\\.js/],
  ['093 GĐV Fusion script path', /fusion\\/gdv-093\\.js/],
  ['hard-coded Apps Script endpoint', /https?:\\/\\/script\\.google\\.com\\/macros\\/s\\//]
];

const violations = [];
for (const file of coreFiles) {
  for (const [label, pattern] of forbiddenCoreIntegrations) {
    if (pattern.test(file.source)) violations.push(file.name + ': ' + label);
  }
}
assert.deepEqual(
  violations,
  [],
  'App-specific integrations must not be imported/called directly from Core modules:\n' + violations.join('\n')
);

// app-core.js is intentionally called out as the current 093 app assembly, not neutral Core.
// This guard prevents future documentation from treating that legacy entry point as the reusable Core package.
const assembly = read('core/app-core.js');
assert.match(assembly, /PTI093GdvFusion\\.install/);
assert.match(assembly, /PTI093DriveFusion\\.install/);
assert.match(assembly, /PTI093ClassicImageGridSkin\\.install/);

// The 093 shell is allowed to load 093 integrations, but the separately packaged PTI admin
// and extracted Classic skin must not be silently activated by this legacy entry point.
const html = read('index.html');
assert.match(html, /fusion\\/drive\\.js/);
assert.match(html, /fusion\\/gdv-093\\.js/);
assert.doesNotMatch(html, /modules\\/pti-gdv-admin\\/admin-gdv\\.js/);
assert.doesNotMatch(html, /skins\\/classic\\/skin\\.js/);

const compatibilityMarkers = [
  ['Drive record state', /driveRecordId/g],
  ['Drive open state', /driveOpenPending|driveOpenIncomplete/g],
  ['Drive UI callback name', /setDriveState/g],
  ['Drive metadata fields', /driveFileId|driveUploadKey/g]
];
const coupling = compatibilityMarkers.map(([label, pattern]) => ({
  label,
  files: coreFiles.filter(file => pattern.test(file.source)).map(file => file.name)
}));
console.log('PASS: Core domain modules do not directly import/call Drive Fusion or GĐV integration APIs.');
console.log('AUDIT: core/app-core.js is still the legacy 093 assembly (Drive Fusion + 093 GĐV Fusion + Classic UI), not a neutral Core entry point.');
for (const item of coupling) {
  console.log('COMPATIBILITY COUPLING — ' + item.label + ': ' + (item.files.join(', ') || 'none'));
}
console.log('PASS: legacy 093 shell loads its own Fusion; PTI GĐV Admin and extracted Classic Skin stay opt-in packages.');
