const assert = require('node:assert/strict');
const store = new Map();
global.window = global;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
require('../fusion/drive.js');
assert.ok(global.PTI093DriveFusion, 'Drive Fusion module should load');
const driveModule = require('node:fs').readFileSync('fusion/drive.js', 'utf8');
assert.ok(driveModule.includes('async function optimizeDriveImage'), 'Drive image optimizer should live in Drive Fusion');
assert.ok(driveModule.includes('async function sha256HexBlob'), 'Drive SHA-256 helper should live in Drive Fusion');
assert.match(driveModule,/const DRIVE_CONCURRENCY\s*=\s*5;/,'093 Drive Fusion must preserve the validated five-file concurrency baseline');
assert.ok(driveModule.includes('await Promise.all(entries.map(processOne))'),'Drive Fusion must await every file in each batch before advancing progress');
assert.equal((driveModule.match(/await finalizeCompletedSession\(\)/g)||[]).length,1,'Drive Fusion should call the raw finalizer only inside the guarded post-save helper');
assert.ok(driveModule.includes('if(cleanupOk)setDriveState('),'Drive success handlers must not overwrite the cleanup-warning state');
const deps = {
  state: { groups: [], current: { title: '', items: [] }, driveRecordId: '', localDraftId: '' },
  $: () => ({ value: '', textContent: '', innerHTML: '', style: {}, options: [], classList: { add(){}, remove(){} }, appendChild(){}, setAttribute(){}, addEventListener(){} }),
  msg: () => {},
  getAllGroups: () => [],
  snapshotGroupsForProject: () => [],
  selectedGdv: () => '',
  scheduleAutoDraftSave: () => {},
  finalizeCompletedSession: async () => {},
  getDateISO: () => '2026-10-22',
  setDateInput: () => {},
  render: () => {},
  renderLayout: () => {},
  deviceStorageLabel: () => 'local',
  searchQueryVariants: () => [],
  getLocalDrafts: async () => [],
  openLocalDraft: async () => {},
  normalizeRecordSearch: value => String(value || '').toLowerCase(),
  gdvSearchMatches: () => false,
  gdvInitials: () => '',
  wrap: value => value
};
const api = global.PTI093DriveFusion.install(deps);
for (const name of ['openRecordFromDrive','recordMatchesQuery','recordTime','sameLocalDriveRecord','searchDriveRecords','saveProjectToDrive','driveImageKey','getDriveUploadedKeys','saveDriveUploadedKeys','getDrivePendingUploadKey','saveDrivePendingUploadKey','prepareDriveItem','waitForUploadStatus','sendDrivePayload','renderDriveUploadFailures','createDriveRecord','pti093UploadAll','bindControls']) {
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
const appCore = fs.readFileSync('core/app-core.js', 'utf8');
assert.ok(html.includes('<link rel="stylesheet" href="./css/skin-classic.css">'), 'Classic skin should be external');
assert.ok(html.includes('<link rel="stylesheet" id="uiRefreshV42" href="./css/skin-modern.css">'), 'Modern skin toggle target should remain addressable');
assert.equal((html.match(/<style\b/gi) || []).length, 0, 'All static skin/style blocks should be externalized');
for (const file of ['skin-classic.css','skin-modern.css', ...Array.from({length:13}, (_,i) => 'skin-overrides-' + String(i+3).padStart(2,'0') + '.css')]) {
  const css = fs.readFileSync('css/' + file, 'utf8');
  assert.ok(css.length > 0, file + ' should exist and be non-empty');
  assert.ok(html.includes('./css/' + file), file + ' should be linked from index.html');
}

assert.ok(html.indexOf('src="./core/gdv-search.js"') < html.indexOf('src="./fusion/drive.js"'), 'Shared Core should load before app-specific Drive Fusion');
assert.ok(appCore.indexOf('window.PTI093DriveFusion.install(') >= 0, 'App Core should install Drive Fusion');
assert.ok(appCore.includes('driveSaveFusion.bindControls();'), 'App Core should delegate Drive button bindings to Drive Fusion');
assert.ok(driveModule.includes("$('driveSaveProject').onclick=async()=>{"), 'Drive Fusion should own the save-project handler');
assert.ok(driveModule.includes("$('driveCreate').onclick=createDriveRecord;"), 'Drive Fusion should own the create-record handler');
const draftSource = fs.readFileSync('core/draft-recovery.js', 'utf8');
const localStoreSource = fs.readFileSync('core/local-draft-store.js', 'utf8');
const workspaceSource = fs.readFileSync('core/workspace.js', 'utf8');
const localSaveSource = fs.readFileSync('core/local-save.js', 'utf8');
const loadProgressSkinSource = fs.readFileSync('skin/classic-load-progress.js', 'utf8');
assert.ok(html.includes('src="./core/draft-recovery.js"'), 'Shared Core draft module should be loaded');
assert.ok(html.includes('src="./core/local-draft-store.js"'), 'Shared Core local storage adapter should be loaded');
assert.ok(appCore.includes("dbName:'pti093_local_drafts_v1'"), 'Existing 093 local draft database name should remain unchanged');
for (const marker of ['AUTO-DRAFT', 'async function restoreAutoDraft', 'async function saveAutoDraft']) {
  assert.ok(draftSource.includes(marker), 'Existing 093 draft-recovery code must remain in Core: ' + marker);
}


assert.ok(driveModule.includes("$('driveSearchBtn').onclick=searchDriveRecords;"), 'Drive Fusion should own the search button handler');
assert.ok(!html.includes('function openRecordFromDrive(') && !html.includes('function searchDriveRecords('), 'Drive record functions should live outside index.html');
assert.ok(loadProgressSkinSource.includes('function finishOpenLoad('), 'Open-progress completion presentation should live in the Classic Skin module');
assert.ok(html.includes('src="./skin/classic-load-progress.js"'), 'Classic Load Progress Skin should be loaded before App Core');
assert.ok(appCore.includes('setOpenLoad,finishOpenLoad,getAllGroups'), 'Drive Fusion must receive the app-owned open-load completion callback through dependency injection');
assert.ok(html.includes('src="./core/workspace.js"'), 'Shared workspace Core should be loaded');
assert.ok(html.includes('src="./core/local-save.js"'), 'Shared local-save Core should be loaded');
assert.ok(localSaveSource.includes('async function saveLocalDraft'), 'Manual local-save should be owned by Core');
assert.ok(!html.includes('async function saveLocalDraft(') && !html.includes('async function saveDraftWithoutPhotos('), 'Manual local-save functions should not remain in the app monolith');
assert.ok(workspaceSource.includes('function snapshotGroupsForProject(state)'), 'Workspace Core should own the shared snapshot helper');
assert.ok(appCore.includes('workspaceCore.snapshotGroupsForProject(state)'), 'Manual local-save should use the shared workspace snapshot');
assert.ok(!driveModule.includes('function snapshotGroupsForProject('), 'Drive Fusion should consume the shared snapshot adapter, not own it');
assert.ok(driveModule.includes('snapshotGroupsForProject, selectedGdv'), 'Drive Fusion should receive the workspace snapshot through dependency injection');

console.log('093 Drive Fusion tests passed (source contract + storage helpers).');

(async()=>{
  const cleanupEvents={states:[],messages:[]};
  const cleanupApi=global.PTI093DriveFusion.install({
    ...deps,
    setDriveState:(text,ok)=>cleanupEvents.states.push({text,ok}),
    msg:(text,show)=>cleanupEvents.messages.push({text,show}),
    finalizeCompletedSession:async()=>false
  });
  const finalized=await cleanupApi.finalizeAfterSuccessfulDriveSave();
  assert.equal(finalized,false,'post-save cleanup failure must be surfaced separately from the completed Drive save');
  assert.match(cleanupEvents.states[0].text,/Hồ sơ Drive đã lưu thành công, nhưng chưa dọn được nháp tự động/);
  assert.equal(cleanupEvents.states[0].ok,false);
  assert.match(cleanupEvents.messages[0].text,/Hồ sơ Drive đã lưu thành công/);
  console.log('Drive Fusion post-save cleanup regression passed (successful Drive save is not misreported as failed).');
})().catch(error=>{console.error(error);process.exitCode=1});

assert.ok(driveModule.includes('function readStoredDriveRecordId()'), 'Drive record ID fallback should use a guarded storage helper');
assert.ok(driveModule.includes('function persistDriveRecordId(recordId)'), 'Drive record ID persistence should be best-effort');
assert.match(driveModule,/try\{return global\.sessionStorage\.getItem\('pti093_driveRecordId'\)\|\|''\}catch\(e\)\{return ''\}/,'blocked sessionStorage must not break Drive record ID lookup');
console.log('Drive record ID storage resilience contract passed.');


(async()=>{
  const originalFetch=global.fetch,originalDocument=global.document,originalScrollY=global.scrollY,originalScrollTo=global.scrollTo,originalFile=global.File,originalWarn=console.warn;
  const elements={};
  const element=id=>elements[id]||(elements[id]={value:'',textContent:'',innerHTML:'',style:{},options:[],dataset:{},disabled:false,onclick:null,
    classList:{add(){},remove(){},toggle(){}},appendChild(){},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {top:0}}});
  const statusEvents=[],messages=[],progress=[],finished=[],autosaveEvents=[];
  const state={groups:[],current:{title:'',items:[]},driveRecordId:'',localDraftId:'',driveOpenIncomplete:false,driveOpenPending:false,workspaceOpenPending:false,orientation:'portrait',per:6,addSeq:0};
  let failSecondImage=true,emptySecondImage=false,failOpenRecord=false,fetchCalls=0,releaseSecondImage=null,signalSecondImageStarted;
  const secondImageStarted=new Promise(resolve=>{signalSecondImageStarted=resolve});
  global.document={querySelectorAll:()=>[]};
  global.scrollY=0;global.scrollTo=()=>{};
  global.File=class TestFile{
    constructor(parts,name,options={}){this.name=name;this.type=options.type||'application/octet-stream';this.size=parts.reduce((n,p)=>n+(p&&p.size||p&&p.byteLength||String(p).length),0);this.lastModified=options.lastModified||0}
  };
  global.fetch=async url=>{
    fetchCalls++;
    if(String(url).includes('action=openRecord')){if(failOpenRecord)throw new Error('record endpoint unavailable');return {json:async()=>({
      success:true,
      project:{recordId:'DRIVE-PARTIAL',caseNumber:'HS-1',bks:'30A-1',sections:[{title:'Section A',items:[
        {fileId:'F1',fileName:'one.jpg',clientKey:'one'},
        {fileId:'F2',fileName:'two.jpg',clientKey:'two'}
      ]}],settings:{orientation:'portrait',imagesPerPage:6}},
      record:{recordId:'DRIVE-PARTIAL',caseNumber:'HS-1',bks:'30A-1'},
      images:[{fileId:'F1',fileName:'one.jpg'},{fileId:'F2',fileName:'two.jpg'}]
    })};}
    if(String(url).includes('action=getImage')&&String(url).includes('fileId=F1'))return {json:async()=>({success:true,base64:Buffer.from('image-one').toString('base64'),mimeType:'image/jpeg',fileName:'one.jpg'})};
    if(String(url).includes('action=getImage')&&String(url).includes('fileId=F2')){
      if(failSecondImage)return new Promise(resolve=>{
        releaseSecondImage=()=>resolve({json:async()=>({success:false,error:'image unavailable'})});
        signalSecondImageStarted();
      });
      return {json:async()=>({success:true,base64:emptySecondImage?'':Buffer.from('image-two').toString('base64'),mimeType:'image/jpeg',fileName:'two.jpg'})};
    }
    throw new Error('Unexpected fetch in partial-open test: '+url);
  };
  console.warn=()=>{};
  const api=global.PTI093DriveFusion.install({
    ...deps,state,$:element,scheduleAutoDraftSave:dirty=>autosaveEvents.push(dirty),
    setDriveState:(text,ok)=>statusEvents.push({text,ok}),
    setOpenLoad:(...args)=>progress.push(args),
    finishOpenLoad:(...args)=>finished.push(args),
    getDateISO:()=>'2026-10-23',setDateInput:value=>{element('date').value=value},
    render:()=>{},renderLayout:()=>{},msg:(text,show)=>messages.push({text,show})
  });
  try{
    const opening=api.openRecordFromDrive('DRIVE-PARTIAL');
    await secondImageStarted;
    assert.equal(state.workspaceOpenPending,true,'the shared workspace lock must remain active during Drive open');
    assert.equal(state.driveOpenPending,true,'the Drive pending-open lock must remain active until all image downloads settle');
    assert.equal(state.driveOpenIncomplete,true,'Drive writes must be guarded while the record is still downloading images');
    await assert.rejects(()=>api.openRecordFromDrive('DRIVE-OTHER'),/Đang mở hồ sơ khác/,'a second Drive open must not race the first open');
    await assert.rejects(()=>api.saveProjectToDrive(false),/Đang mở hồ sơ/,'writes must be blocked during an in-progress open');
    releaseSecondImage();
    await opening;
    assert.equal(state.current.items.length,1,'only the successfully downloaded image should enter the workspace');
    assert.equal(state.workspaceOpenPending,false,'shared workspace lock must clear after the downloads settle');
    assert.equal(state.driveOpenPending,false,'pending-open lock must clear after the downloads settle');
    assert.equal(state.driveOpenIncomplete,true,'a partially loaded Drive record must be marked unsafe to overwrite');
    assert.equal(autosaveEvents.at(-1),true,'partial Drive open must autosave the partial workspace together with its write guard');
    assert.match(statusEvents.at(-1).text,/chỉ tải được 1\/2 ảnh/,'partial open must not report success');
    assert.equal(statusEvents.at(-1).ok,false,'partial open status must be an error/warning state');
    assert.equal(finished.length,0,'partial open must not mark the progress bar as fully completed');
    assert.match(progress.at(-1)[3],/Không lưu đè lên Drive/,'progress detail must warn against overwriting the incomplete record');
    const beforeBlockedCalls=fetchCalls;
    await assert.rejects(()=>api.saveProjectToDrive(false),/Hồ sơ Drive chưa tải đủ ảnh/,'project save must be blocked for an incomplete Drive open');
    const uploadResult=await api.pti093UploadAll();
    assert.equal(uploadResult.failures.length,1,'upload must be blocked rather than silently sending a partial set');
    await api.createDriveRecord();
    assert.equal(fetchCalls,beforeBlockedCalls,'save/create/upload guards must not send another request while incomplete');

    failSecondImage=false;
    await api.openRecordFromDrive('DRIVE-PARTIAL');
    assert.equal(state.workspaceOpenPending,false,'complete reopen must clear shared workspace lock');
    assert.equal(state.driveOpenPending,false,'complete reopen must clear pending-open lock');
    assert.equal(state.driveOpenIncomplete,false,'a subsequent complete reopen must clear the guard');
    assert.equal(autosaveEvents.at(-1),true,'complete Drive open must replace any stale AUTO-DRAFT for this session');
    assert.equal(state.current.items.length,2,'both images should be restored on the successful retry');
    assert.equal(finished.length,1,'only the fully loaded retry should complete the progress bar');
    assert.match(statusEvents.at(-1).text,/Đã tải hoàn tất hồ sơ .*từ Google Drive/,'complete reopen should restore the success status');
    // Regression: a nominally successful image response with empty base64 must not count as loaded.
    emptySecondImage=true;
    await api.openRecordFromDrive('DRIVE-PARTIAL');
    assert.equal(state.current.items.length,1,'an empty image payload must not enter the workspace as a valid photo');
    assert.equal(state.driveOpenIncomplete,true,'an empty image payload must keep the Drive overwrite guard active');
    assert.match(statusEvents.at(-1).text,/chỉ tải được 1\\/2 ảnh/,'empty image payload must be reported as a partial load');
    await assert.rejects(()=>api.saveProjectToDrive(false),/Hồ sơ Drive chưa tải đủ ảnh/,'empty image payload must not permit overwriting the remote record');
    emptySecondImage=false;
    await api.openRecordFromDrive('DRIVE-PARTIAL');
    assert.equal(state.driveOpenIncomplete,false,'a subsequent valid full reopen should clear the empty-payload guard');
    const completedTitle=state.current.title;
    failOpenRecord=true;
    await assert.rejects(()=>api.openRecordFromDrive('DRIVE-UNAVAILABLE'),/record endpoint unavailable/);
    assert.equal(state.workspaceOpenPending,false,'failed Drive open must release shared workspace lock');
    assert.equal(state.driveOpenPending,false,'failed Drive open must release Drive pending lock');
    assert.equal(state.current.title,completedTitle,'failed Drive open must preserve the active workspace');
    assert.match(statusEvents.at(-1).text,/Không thể đọc hồ sơ từ Google Drive/,'failed Drive open must surface an actionable status');

    // Regression: Local Open shares workspaceOpenPending but does not set the Drive-specific
    // pending flag. The public uploader/save button must still refuse writes during that window.
    state.workspaceOpenPending=true;
    state.driveOpenPending=false;
    state.driveOpenIncomplete=false;
    (state.current.items||[]).forEach(item=>{
      item.driveFileId='';
      item.driveFileName='';
      item.driveUploadKey='';
      item.drivePendingUploadKey='';
    });
    const uploadCallsBeforeWorkspaceLock=fetchCalls;
    const lockedUpload=await api.pti093UploadAll();
    assert.equal(lockedUpload.failures.length,1,'uploader must reject while a local workspace transition holds the shared lock');
    assert.match(lockedUpload.failures[0].error,/Đang mở hồ sơ/,'workspace lock rejection must explain that an open is in progress');
    assert.equal(fetchCalls,uploadCallsBeforeWorkspaceLock,'upload must not start a Drive request while another workspace is opening');
    state.workspaceOpenPending=false;
    console.log('Drive Fusion regressions passed: partial loads block writes, full reopen recovers, network failure releases locks, and the shared workspace lock blocks upload.');
  }finally{
    global.fetch=originalFetch;console.warn=originalWarn;
    if(originalDocument===undefined)delete global.document;else global.document=originalDocument;
    if(originalScrollY===undefined)delete global.scrollY;else global.scrollY=originalScrollY;
    if(originalScrollTo===undefined)delete global.scrollTo;else global.scrollTo=originalScrollTo;
    if(originalFile===undefined)delete global.File;else global.File=originalFile;
  }
})().catch(error=>{console.error(error);process.exitCode=1});
