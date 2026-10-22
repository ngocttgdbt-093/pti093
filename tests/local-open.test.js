const assert = require('node:assert/strict');
global.window = global;
global.File = class FakeFile {
  constructor(parts, name, options = {}) {
    this.name = name;
    this.type = options.type || 'image/jpeg';
    this.lastModified = options.lastModified || 0;
    this.size = 10;
    this.data = parts[0];
  }
};
global.IDBKeyRange = { only: value => value };
global.scrollY = 0;
global.sessionStorage = { setItem(){}, removeItem(){}, getItem(){ return null; } };
global.localStorage = { setItem(){}, removeItem(){}, getItem(){ return null; } };
require('../core/local-open.js');

const meta = {
  id: 'LOCAL-TEST-1',
  caseNumber: 'HS-123',
  bks: '30A-12345',
  garage: 'Garage A',
  date: '22/10/2026',
  gdv: 'Nguyễn Minh Ngọc',
  settings: { orientation: 'portrait', imagesPerPage: 6 },
  sections: [{
    title: 'Ảnh thiệt hại',
    items: [{ fileName: 'damage.jpg', type: 'image/jpeg', lastModified: 123, size: 10, key: 'k1', caption: 'Mặt trước', rotate: 90, addSeq: 1 }]
  }]
};
const storedImages = [{
  sectionIndex: 0,
  itemIndex: 0,
  file: { storedBytes: true },
  fileName: 'damage.jpg',
  type: 'image/jpeg',
  lastModified: 123
}];
let closed = 0;
global.indexedDB = {};
const db = {
  close(){ closed++; },
  transaction(storeName){
    if (storeName === 'drafts') return { objectStore: () => ({ get: () => {
      const req = {};
      queueMicrotask(() => { req.result = meta; req.onsuccess && req.onsuccess(); });
      return req;
    } }) };
    if (storeName === 'draftImages') return { objectStore: () => ({ index: () => ({ getAll: () => {
      const req = {};
      queueMicrotask(() => { req.result = storedImages; req.onsuccess && req.onsuccess(); });
      return req;
    } }) }) };
    throw new Error('Unexpected store: ' + storeName);
  }
};
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '',
    textContent: '',
    dataset: {},
    options: id === 'gdv' ? [{ value: 'Nguyễn Minh Ngọc' }] : [],
    classList: { add(){}, remove(){}, toggle(){} },
    style: {},
    getBoundingClientRect: () => ({ top: 0 })
  });
  return elements.get(id);
}
global.document = { querySelectorAll: () => [] };
const calls = { progress: [], status: [], finished: 0, rendered: 0, layout: 0, messages: [] };
const appState = { groups: [], current: { title: '', items: [] }, editing: -1, per: 6, orientation: 'portrait', driveRecordId: '', localDraftId: '', addSeq: 0 };
const api = global.PTI093LocalOpenCore.install({
  state: appState,
  $: element,
  msg: text => calls.messages.push(text),
  openLocalDraftDB: async () => db,
  setDateInput: value => { element('date').value = value; },
  render: () => { calls.rendered++; },
  renderLayout: () => { calls.layout++; },
  setDriveState: text => calls.status.push(text),
  deviceStorageLabel: () => 'PC',
  setOpenLoad: (...args) => calls.progress.push(args),
  finishOpenLoad: (...args) => { calls.finished++; calls.finishedArgs = args; }
});
(async () => {
  await api.openLocalDraft('LOCAL-TEST-1');
  assert.equal(appState.localDraftId, 'LOCAL-TEST-1');
  assert.equal(appState.driveRecordId, '');
  assert.equal(appState.current.items.length, 1);
  assert.equal(appState.current.items[0].caption, 'Mặt trước');
  assert.equal(appState.current.items[0].rotate, 90);
  assert.equal(element('hoso').value, 'HS-123');
  assert.equal(element('bks').value, '30A-12345');
  assert.equal(element('garage').value, 'Garage A');
  assert.equal(element('title').value, 'Ảnh thiệt hại');
  assert.equal(element('driveId').textContent, '💻 Bản lưu tại máy: LOCAL-TEST-1');
  assert.equal(element('gdv').value, 'Nguyễn Minh Ngọc');
  assert.equal(element('date').value, '22/10/2026');
  assert.equal(calls.finished, 1);
  assert.equal(calls.rendered, 1);
  assert.equal(calls.layout, 1);
  assert.ok(calls.progress.length >= 2);
  assert.equal(closed, 1);
  console.log('Local Open Core tests passed (12 checks).');
})().catch(error => { console.error(error); process.exitCode = 1; });
