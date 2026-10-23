const assert=require('node:assert/strict');
global.window=global;
require('../core/image-ingest.js');
(async function(){
  const state={current:{items:[{key:'old.jpg|5|1'}]},filenameCaption:true,addSeq:2};
  const messages=[],saves=[],renders=[];
  const api=global.PTI093ImageIngest.install({
    state,exts:/\.(jpe?g|png|webp|gif|heic|heif)$/i,
    fileBaseName:name=>String(name||'').replace(/\.[^.]+$/,''),
    scheduleAutoDraftSave:dirty=>saves.push(dirty),
    render:()=>renders.push('render'),
    msg:(text,show)=>messages.push({text,show})
  });
  const files=[
    {name:'old.jpg',size:5,lastModified:1,type:'image/jpeg'},
    {name:'new-photo.jpg',size:10,lastModified:2,type:'image/jpeg'},
    {name:'new-photo.jpg',size:10,lastModified:2,type:'image/jpeg'}, // repeated within one selection batch
    {name:'scan.heic',size:20,lastModified:3,type:''},
    {name:'scene.jpg',size:12,lastModified:34,type:'image/jpeg',webkitRelativePath:'folderA/scene.jpg'},
    {name:'scene.jpg',size:12,lastModified:34,type:'image/jpeg',webkitRelativePath:'folderB/scene.jpg'},
    {name:'notes.txt',size:30,lastModified:4,type:'text/plain'}
  ];
  await api.addFiles(files);
  assert.equal(state.current.items.length,5);
  assert.deepEqual(state.current.items.slice(1).map(x=>({name:x.file.name,caption:x.caption,addSeq:x.addSeq,rotate:x.rotate})),[
    {name:'new-photo.jpg',caption:'new-photo',addSeq:3,rotate:0},
    {name:'scan.heic',caption:'scan',addSeq:4,rotate:0},
    {name:'scene.jpg',caption:'scene',addSeq:5,rotate:0},
    {name:'scene.jpg',caption:'scene',addSeq:6,rotate:0}
  ]);
  assert.notEqual(state.current.items[3].key,state.current.items[4].key,
    'same-name files in different folders must keep distinct keys');
  assert.deepEqual(saves,[true]);
  assert.deepEqual(renders,['render']);
  assert.match(messages[0].text,/Đã nhận 4 ảnh/);
  await api.addFiles([{name:'old.jpg',size:5,lastModified:1,type:'image/jpeg'},{name:'notes.txt',size:30,lastModified:4,type:'text/plain'}]);
  assert.equal(state.current.items.length,5,'existing duplicates and unsupported files should not be added');
  assert.deepEqual(saves,[true],'no-op ingestion should not schedule another save');
  assert.equal(messages[1].text,'Không có ảnh mới để thêm.');
  state.workspaceOpenPending=true;
  const beforePending=state.current.items.length;
  const savesBeforePending=saves.length;
  await api.addFiles([{name:'late.jpg',size:8,lastModified:8,type:'image/jpeg'}]);
  assert.equal(state.current.items.length,beforePending,'image intake must not mutate the old workspace during open');
  assert.equal(saves.length,savesBeforePending,'blocked intake must not schedule autosave');
  assert.match(messages.at(-1).text,/Đang mở hồ sơ khác/);
  console.log('Image Ingest Core tests passed: filtering, duplicate avoidance, path-aware keys, and workspace-open lock.');
})().catch(e=>{console.error(e);process.exit(1)});
