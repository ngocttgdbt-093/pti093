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
global.scrollTo = () => {};
global.sessionStorage = { setItem(){}, removeItem(){}, getItem(){ return null; } };
global.localStorage = { setItem(){}, removeItem(){}, getItem(){ return null; } };
require('../core/workspace.js');
require('../core/local-open.js');

const meta = {
  id: 'LOCAL-TEST-1',
  caseNumber: 'HS-123',
  bks: '30A-12345',
  garage: 'Garage A',
  date: '22/10/2026',
  gdv: 'Nguyễn Minh Ngọc',
  settings: { orientation: 'portrait', imagesPerPage: 6 },
  sections: [
    { title: 'Ảnh hiện trường', items: [{ fileName: 'scene.jpg', type: 'image/jpeg', lastModified: 111, size: 10, key: 'k0', caption: 'Toàn cảnh', rotate: 0, addSeq: 1 }] },
    { title: 'Ảnh thiệt hại', items: [{ fileName: 'damage.jpg', type: 'image/jpeg', lastModified: 123, size: 10, key: 'k1', caption: 'Mặt trước', rotate: 90, addSeq: 2 }] }
  ]
};
const storedImages = [
  { sectionIndex: 0, itemIndex: 0, file: { storedBytes: true }, fileName: 'scene.jpg', type: 'image/jpeg', lastModified: 111 },
  { sectionIndex: 1, itemIndex: 0, file: { storedBytes: true }, fileName: 'damage.jpg', type: 'image/jpeg', lastModified: 123 }
];
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
const appState = { groups: [], current: { title: '', items: [] }, editing: -1, per: 6, orientation: 'portrait', driveRecordId: '', localDraftId: '', driveOpenIncomplete: true, driveOpenPending:false, workspaceOpenPending:false, addSeq: 0 };
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
  assert.equal(appState.driveOpenIncomplete, false, 'successful local open must clear the incomplete Drive guard');
  assert.equal(appState.workspaceOpenPending,false,'successful local open must release the shared workspace lock');
  assert.equal(appState.groups.length, 1);
  assert.equal(appState.groups[0].title, 'Ảnh hiện trường');
  assert.equal(appState.groups[0].items[0].caption, 'Toàn cảnh');
  assert.equal(appState.current.items.length, 1);
  assert.equal(appState.current.title, 'Ảnh thiệt hại');
  assert.equal(appState.current.items[0].caption, 'Mặt trước');
  const orderedSnapshot = global.PTIWorkspaceCore.snapshotGroupsForProject(appState);
  assert.deepEqual(orderedSnapshot.map(group => group.title), ['Ảnh hiện trường', 'Ảnh thiệt hại'],
    'reopening and saving a local case must preserve the original section order');
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

  const failureCalls={progress:[],status:[]};
  const failureApi=global.PTI093LocalOpenCore.install({
    state:appState,$:element,msg:()=>{},
    openLocalDraftDB:async()=>{throw new Error('IndexedDB unavailable')},
    setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:text=>failureCalls.status.push(text),
    deviceStorageLabel:()=> 'PC',
    setOpenLoad:(...args)=>failureCalls.progress.push(args),
    finishOpenLoad:()=>{}
  });
  await assert.rejects(failureApi.openLocalDraft('LOCAL-FAIL'),/IndexedDB unavailable/);
  assert.match(failureCalls.progress.at(-1)[3],/Không thể đọc bản lưu tại máy/,
    'failed local-open must replace the stuck loading message with an actionable error');
  assert.match(failureCalls.status.at(-1),/Không thể đọc bản lưu tại máy/,
    'failed local-open must also clear the stale Drive loading status');
  assert.equal(appState.workspaceOpenPending,false,'failed local open must release the shared workspace lock');

  const missingDb={
    close(){},
    transaction(storeName){
      if(storeName==='drafts')return {objectStore:()=>({get:()=>{const req={};queueMicrotask(()=>{req.result=undefined;req.onsuccess&&req.onsuccess()});return req}})};
      if(storeName==='draftImages')return {objectStore:()=>({index:()=>({getAll:()=>{const req={};queueMicrotask(()=>{req.result=[];req.onsuccess&&req.onsuccess()});return req}})})};
      throw new Error('Unexpected store: '+storeName);
    }
  };
  const missingCalls={progress:[],status:[]};
  const missingApi=global.PTI093LocalOpenCore.install({
    state:appState,$:element,msg:()=>{},openLocalDraftDB:async()=>missingDb,
    setDateInput:()=>{},render:()=>{},renderLayout:()=>{},setDriveState:text=>missingCalls.status.push(text),
    deviceStorageLabel:()=> 'PC',setOpenLoad:(...args)=>missingCalls.progress.push(args),finishOpenLoad:()=>{}
  });
  await assert.rejects(missingApi.openLocalDraft('LOCAL-MISSING'),/Không tìm thấy bản nháp tại máy/);
  assert.match(missingCalls.progress.at(-1)[3],/Không tìm thấy bản lưu tại máy/,
    'missing metadata must not leave the local-open progress stuck');
  assert.match(missingCalls.status.at(-1),/Không tìm thấy bản lưu tại máy/,
    'missing metadata must also clear the stale Drive loading status');

  const incompleteDb={
    close(){},
    transaction(storeName){
      if(storeName==='drafts')return {objectStore:()=>({get:()=>{const req={};queueMicrotask(()=>{req.result=meta;req.onsuccess&&req.onsuccess()});return req}})};
      if(storeName==='draftImages')return {objectStore:()=>({index:()=>({getAll:()=>{const req={};queueMicrotask(()=>{req.result=storedImages.slice(0,1);req.onsuccess&&req.onsuccess()});return req}})})};
      throw new Error('Unexpected store: '+storeName);
    }
  };
  const incompleteCalls={progress:[],status:[]};
  const incompleteApi=global.PTI093LocalOpenCore.install({
    state:appState,$:element,msg:()=>{},openLocalDraftDB:async()=>incompleteDb,
    setDateInput:()=>{},render:()=>{throw new Error('Must not render a partial restore')},
    renderLayout:()=>{throw new Error('Must not render a partial restore')},setDriveState:text=>incompleteCalls.status.push(text),
    deviceStorageLabel:()=> 'PC',setOpenLoad:(...args)=>incompleteCalls.progress.push(args),finishOpenLoad:()=>{}
  });
  const stateBeforeIncompleteOpen=JSON.stringify(appState);
  await assert.rejects(incompleteApi.openLocalDraft('LOCAL-TEST-1'),/thiếu dữ liệu của 1\/2 ảnh/,
    'opening a draft with missing image blobs must fail instead of silently dropping photos');
  assert.equal(JSON.stringify(appState),stateBeforeIncompleteOpen,
    'an incomplete draft must not replace or mutate the currently open workspace');
  assert.match(incompleteCalls.progress.at(-1)[3],/Hồ sơ đang mở được giữ nguyên/,
    'incomplete restore must show an actionable message and preserve the active case');
  assert.match(incompleteCalls.status.at(-1),/thiếu dữ liệu của 1\/2 ảnh/,
    'incomplete restore must clear the stale loading status with the missing-image error');

  const failedListDb={
    close(){closed++},
    transaction(storeName){
      if(storeName==='drafts')return {objectStore:()=>({get:()=>{const req={};queueMicrotask(()=>{req.result=meta;req.onsuccess&&req.onsuccess()});return req}})};
      if(storeName==='draftImages')return {objectStore:()=>({index:()=>({getAll:()=>{const req={};queueMicrotask(()=>{req.error=new Error('draftImages index read failed');req.onerror&&req.onerror()});return req}})})};
      throw new Error('Unexpected store: '+storeName);
    }
  };
  const failedListCalls={progress:[],status:[],rendered:0};
  const failedListApi=global.PTI093LocalOpenCore.install({
    state:appState,$:element,msg:()=>{},openLocalDraftDB:async()=>failedListDb,
    setDateInput:()=>{},render:()=>{failedListCalls.rendered++},renderLayout:()=>{failedListCalls.rendered++},
    setDriveState:text=>failedListCalls.status.push(text),deviceStorageLabel:()=> 'PC',
    setOpenLoad:(...args)=>failedListCalls.progress.push(args),finishOpenLoad:()=>{}
  });
  const stateBeforeImageListFailure=JSON.stringify(appState);
  const closedBeforeImageListFailure=closed;
  await assert.rejects(failedListApi.openLocalDraft('LOCAL-TEST-1'),/draftImages index read failed/,
    'metadata success followed by image-list failure must abort the whole open operation');
  assert.equal(JSON.stringify(appState),stateBeforeImageListFailure,
    'failed image-list read must not partially replace the active workspace or record IDs');
  assert.equal(failedListCalls.rendered,0,'failed image-list read must not render a partial case');
  assert.match(failedListCalls.status.at(-1),/Không thể đọc bản lưu tại máy/,
    'failed image-list read must clear the stale loading status');
  assert.match(failedListCalls.progress.at(-1)[3],/Không thể đọc bản lưu tại máy/,
    'failed image-list read must replace the loading message with an actionable error');
  assert.equal(closed,closedBeforeImageListFailure+1,'database connection must close after the failed parallel read');

  const originalSessionStorage=global.sessionStorage,originalLocalStorage=global.localStorage;
  global.sessionStorage={getItem(){throw new Error('sessionStorage blocked')},setItem(){throw new Error('sessionStorage blocked')},removeItem(){throw new Error('sessionStorage blocked')}};
  global.localStorage={getItem(){throw new Error('localStorage blocked')},setItem(){throw new Error('localStorage blocked')},removeItem(){throw new Error('localStorage blocked')}};
  try{
    await assert.doesNotReject(api.openLocalDraft('LOCAL-TEST-1'),
      'opening a local case should not fail just because Drive preference storage is blocked');
    assert.equal(appState.localDraftId,'LOCAL-TEST-1');
    assert.equal(appState.driveRecordId,'');
  }finally{
    global.sessionStorage=originalSessionStorage;global.localStorage=originalLocalStorage;
  }

  console.log('Local Open Core tests passed (section order, restore fields/images, read-failure progress, and blocked preference storage).');
})().catch(error => { console.error(error); process.exitCode = 1; });
