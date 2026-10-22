
const state={groups:[],current:{title:'Bản ảnh chi tiết thiệt hại',items:[]},editing:-1,per:6,orientation:'portrait',pages:[],pageDefs:[],addSeq:0,replaceIndex:-1,insertIndex:-1,filenameCaption:false,driveUploadFailures:[],localDraftId:''};
const PDF_SAFE_LIMIT=9.5*1048576;
const fileDelivery=window.PTI093FileDelivery.install({navigator,window,document,URL,File,location,setTimeout});
const {exportPdfFile}=fileDelivery;
const $=id=>document.getElementById(id);
const gdvFusion=window.PTI093GdvFusion.install({$,prompt,storage:localStorage});
const {names:PTI093_GDV_NAMES,selectedGdv}=gdvFusion;
const classicStatusSkin=window.PTI093ClassicStatusSkin.install({$});
const {msg,setDriveState}=classicStatusSkin;
const classicLocalSaveSkin=window.PTI093ClassicLocalSaveSkin.install({document});
const {renderLocalSaveFeedback,showLocalSaveConfirm}=classicLocalSaveSkin;
const classicLoadProgressSkin=window.PTI093ClassicLoadProgressSkin.install({$});
const {setOpenLoad,finishOpenLoad}=classicLoadProgressSkin;
const classicImageViewerSkin=window.PTI093ClassicImageViewerSkin.install({document,URL});
const {openImageViewer}=classicImageViewerSkin;
const dateUtils=window.PTI093DateUtils.install({$});
const {formatDateDMY,getDateISO,setDateInput}=dateUtils;
const workspaceCore=window.PTIWorkspaceCore;
const getAllGroups=()=>workspaceCore.getAllGroups(state);
const fileNaming=window.PTI093FileNaming.install({getAllGroups,$,selectedGdv});
const {fileBaseName,gdvShortName,pdfFileName}=fileNaming;
const imageReorder=window.PTI093ImageReorder.install({state,$,scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),renderLayout:()=>renderLayout(),render:()=>render()});
const snapshotGroupsForProject=()=>workspaceCore.snapshotGroupsForProject(state);
const pdfBuilder=window.PTI093PdfBuilder.install({state,PDF_SAFE_LIMIT});
const {pagePixels,jpegQuality,makeCanvas,pdfBytesFromCanvases,resamplePdfCanvases,pdfPackSize,makePdfAt,buildAdaptivePdf,splitPdfBytes}=pdfBuilder;
const imageCanvasCore=window.PTI093ImageCanvasCore.install({state,$,pagePixels,makeCanvas,formatDateDMY,getDateISO,getLogoSrc:()=>logoSrc,getSelectedGdvCache:()=>selectedGdvCache});
const {layoutDims,loadImage,loadLogo,wrap,drawContainRotated,drawPage}=imageCanvasCore;
const previewBuilder=window.PTI093PreviewBuilder.install({drawPage});
const {buildPreview}=previewBuilder;
const classicLayoutSkin=window.PTI093ClassicLayoutSkin.install({state,$,layoutDims,document});
const classicGroupListSkin=window.PTI093ClassicGroupListSkin.install({state,$,document,onEditGroup:i=>editGroup(i)});
const classicImageGridSkin=window.PTI093ClassicImageGridSkin.install({
  state,$,document,URL,imageReorder,openImageViewer,renderGroups:()=>renderGroups(),
  scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),msg,
  onReplace:i=>{state.replaceIndex=i;$('replaceFile').click();},
  onRotate:(item,index)=>{item.rotate=(item.rotate+90)%360;render();scheduleAutoDraftSave(true);msg(`Ảnh số ${index+1} đã xoay ${item.rotate}°.`,true);},
  onInsert:i=>{state.insertIndex=i;$('insertFile').click();},
  onDelete:i=>{state.current.items.splice(i,1);render();scheduleAutoDraftSave(true);},
  onCaptionChange:(item,value)=>{item.caption=value;scheduleAutoDraftSave(false);}
});
const pdfExportCore=window.PTI093PdfExportCore.install({state,PDF_SAFE_LIMIT,drawPage,makePdfAt,pagePixels,jpegQuality,pdfPackSize});
const {splitHighQualityPdf}=pdfExportCore;
const pdfExportController=window.PTI093PdfExportController.install({state,$,splitHighQualityPdf,exportPdfFile,msg,alert,setTimeout,buildAdaptivePdf,pdfPackSize,pdfFileName,getPdfWarningSkin:()=>classicPdfWarningSkin,finalizeCompletedSession:()=>finalizeCompletedSession()});
const {exportHighQualitySplit}=pdfExportController;
const classicPdfWarningSkin=window.PTI093ClassicPdfWarningSkin.install({$,document,exportHighQualitySplit});
const {hidePdfWarning,showPdfWarning}=classicPdfWarningSkin;
const classicPreviewSkin=window.PTI093ClassicPreviewSkin.install({state,$,document,window,buildPreview,getAllGroups,selectedGdv,setSelectedGdvCache:value=>{selectedGdvCache=value;},hidePdfWarning,msg,pagePixels,jpegQuality});
const {makePreview}=classicPreviewSkin;
const exts=/\.(jpe?g|png|webp|gif|heic|heif)$/i;
// ===== THỨ TỰ ẢNH: LUÔN GIỮ ĐÚNG THỨ TỰ GĐV THÊM ẢNH =====
// Không đọc EXIF, không đọc ngày chụp và không tự động sắp xếp theo thời gian.
// addSeq được gán ngay khi GĐV thêm ảnh; ảnh mới luôn nối vào cuối.
const imageIngest=window.PTI093ImageIngest.install({state,exts,fileBaseName,scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),render:()=>render(),msg});
const {addFiles}=imageIngest;
$('clear').onclick=()=>{if(!state.current.items.length)return;if(!confirm('Xóa toàn bộ ảnh của nội dung đang làm?'))return;state.current.items=[];render();scheduleAutoDraftSave(true);msg('Đã xóa ảnh của nội dung hiện tại.',true)};
const classicFileIntakeSkin=window.PTI093ClassicFileIntakeSkin.install({$,addFiles});
function render(){return classicImageGridSkin.render()}function renderGroups(){return classicGroupListSkin.renderGroups()}function editGroup(i){if(state.current.items.length){if(!confirm('Mục hiện tại chưa lưu. Bỏ mục hiện tại để sửa mục đã lưu?'))return}if(!workspaceCore.beginEditGroup(state,i))return;$('filenameCaption').checked=false;$('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');$('preview').innerHTML='';$('previewInfo').textContent='Preview cũ đã được hủy vì hồ sơ đang được chỉnh sửa.';scheduleAutoDraftSave(true);$('pdf').disabled=true;$('backEdit').style.display='none';$('newCase').style.display='none';$('title').value=state.current.title;render();window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'})}
$('title').addEventListener('change',()=>{state.current.title=$('title').value;scheduleAutoDraftSave(false)});
$('filenameCaption').addEventListener('change',e=>{state.filenameCaption=e.target.checked;$('filenameCaption').closest('.filenameCaptionBox').classList.toggle('on',state.filenameCaption);if(state.filenameCaption){state.current.items.forEach(it=>{it.caption=fileBaseName(it.file.name)});render();scheduleAutoDraftSave(false);msg('Đã lấy tên file (bỏ phần đuôi) làm thuyết minh cho các ảnh trong mục này.',true)}else{msg('Đã tắt chế độ lấy tên file; ảnh mới sẽ quay về cách thuyết minh bình thường.',true)}});
$('insertFile').addEventListener('change',async e=>{const fs=[...e.target.files],idx=state.insertIndex;e.target.value='';state.insertIndex=-1;if(idx<0||idx>=state.current.items.length||!fs.length)return;const candidates=[];for(const f of fs){if(!f.type.startsWith('image/')&&!exts.test(f.name))continue;const key=f.name+'|'+f.size+'|'+f.lastModified;if(state.current.items.some(x=>x.key===key)||candidates.some(x=>x.key===key))continue;candidates.push({file:f,key,caption:state.filenameCaption?fileBaseName(f.name):'',addSeq:++state.addSeq,rotate:0})}if(!candidates.length){msg('Không có ảnh mới để chèn.',true);return}state.current.items.splice(idx+1,0,...candidates);render();scheduleAutoDraftSave(true);msg(`Đã chèn ${candidates.length} ảnh sau ảnh số ${idx+1}.`,true)});
$('replaceFile').addEventListener('change',async e=>{const f=e.target.files[0],i=state.replaceIndex;e.target.value='';state.replaceIndex=-1;if(!f||i<0||i>=state.current.items.length)return;if(!f.type.startsWith('image/')&&!exts.test(f.name))return;const old=state.current.items[i];const key=f.name+'|'+f.size+'|'+f.lastModified;const dup=state.current.items.some((x,j)=>j!==i&&x.key===key);if(dup){msg('Ảnh này đã có trong mục hiện tại.',true);return}state.current.items[i]={...old,file:f,key,caption:state.filenameCaption?fileBaseName(f.name):old.caption};render();scheduleAutoDraftSave(true);msg(`Đã thay ảnh số ${i+1}; vị trí và phần thuyết minh được giữ nguyên.`,true)});
function commitCurrent(){return workspaceCore.commitCurrent(state)}
$('saveNext').onclick=()=>{state.current.title=$('title').value;const g=commitCurrent();if(!g)return;state.current={title:$('title').value,items:[]};state.filenameCaption=false;$('filenameCaption').checked=false;$('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');render();scheduleAutoDraftSave(true);msg(`Đã lưu “${g.title}”. Hãy chọn nội dung tiếp theo.`,true);window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'})};
$('finish').onclick=()=>{state.current.title=$('title').value;if(state.current.items.length)commitCurrent();$('title').value=state.current.title;state.current={title:'Bản ảnh chi tiết thiệt hại',items:[]};state.filenameCaption=false;$('filenameCaption').checked=false;$('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');render();scheduleAutoDraftSave(true);makePreview()};
/* Shared workspace group helper is in core/workspace.js */
/* Shared workspace snapshot helper is in core/workspace.js */
// counts

function renderLayout(){return classicLayoutSkin.renderLayout()}
[1,2,3,4,6,8].forEach(n=>{const b=document.createElement('button');b.className='opt'+(n===6?' on':'');b.textContent=n;b.onclick=()=>{state.per=n;document.querySelectorAll('#counts .opt').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderLayout();scheduleAutoDraftSave(false)};$('counts').appendChild(b)});
document.querySelectorAll('#orient .opt').forEach(b=>b.onclick=()=>{state.orientation=b.dataset.o;document.querySelectorAll('#orient .opt').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderLayout();scheduleAutoDraftSave(false)});
// V39: render bố cục ngay sau khi tạo các nút lựa chọn, không phụ thuộc render() hoặc khôi phục bản nháp.
// Nhờ đó vừa mở trang đã thấy đúng 6 ảnh A4 dọc (2 × 3), không cần bấm lại nút 6.
renderLayout();




const logoSrc=document.querySelector('.logo').src;

let selectedGdvCache='';









$('pdf').onclick=()=>pdfExportController.exportStandardPdf($('pdf'));
$('backEdit').onclick=()=>{
  // Nút này nằm bên trong Preview toàn màn hình: phải đóng modal trước khi cuộn về trình sửa.
  if(typeof window.pti093ClosePreview==='function')window.pti093ClosePreview();
  document.body.style.overflow='';
  setTimeout(()=>{
    const drop=$('drop');
    if(drop)window.scrollTo({top:drop.getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});
    msg('Đã quay lại hồ sơ hiện tại. Anh có thể sửa ảnh, thêm ảnh, sửa thuyết minh hoặc sửa từng nội dung.',true);
  },80);
};
// Ghi nhớ GĐV/thụ lý để nút 'Làm tiếp bản ảnh khác' tải lại trang nhưng vẫn giữ gợi ý.
(function(){const custom=localStorage.getItem('pti093_gdv_custom')||'';if(custom)$('gdv').dataset.custom=custom;const saved=localStorage.getItem('pti093_gdv')||'';if(saved&&[...$('gdv').options].some(o=>o.value===saved))$('gdv').value=saved;else if(custom)$('gdv').value='Nhập tên khác';$('gdv').addEventListener('change',()=>{if($('gdv').value!=='Nhập tên khác'){if($('gdv').value)localStorage.setItem('pti093_gdv',$('gdv').value);}else{const x=prompt('Nhập tên GĐV / Thụ lý:',custom||'');if(x){$('gdv').dataset.custom=x;localStorage.setItem('pti093_gdv_custom',x)}else $('gdv').value='';}scheduleAutoDraftSave(false)});})();





$('newCase').onclick=async()=>{const gdv=$('gdv').value==='Nhập tên khác'?($('gdv').dataset.custom||localStorage.getItem('pti093_gdv_custom')||''):$('gdv').value;if(gdv)localStorage.setItem('pti093_gdv',gdv);$('newCase').disabled=true;try{await clearAutoDraft()}catch(e){console.warn(e)}location.reload()};

/* ===== PTI093 GOOGLE DRIVE - GIAI ĐOẠN 1: TẠO RECORD ===== */

state.driveRecordId='';






function deviceStorageLabel(){
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua))return 'iPhone/iPad';
  if(/Android/i.test(ua))return 'điện thoại Android';
  return 'PC';
}
const normalizeRecordSearch=window.PTISharedCore.normalizeRecordSearch;
const gdvInitials=window.PTISharedCore.gdvInitials;
const gdvSearchMatches=window.PTISharedCore.gdvSearchMatches;
const searchQueryVariants=query=>window.PTISharedCore.searchQueryVariants(query,PTI093_GDV_NAMES);



















/* Draft session state moved to core/draft-recovery.js */
/* Draft session state moved to core/draft-recovery.js */
// Mỗi tab có một mã phiên riêng: F5 giữ nguyên sessionStorage, tab mới sẽ tạo phiên mới.
/* Draft session state moved to core/draft-recovery.js */
const localDraftStore=window.PTILocalDraftStore.install({dbName:'pti093_local_drafts_v1'});
const {openLocalDraftDB,localDraftTransactionDone,getLocalDrafts}=localDraftStore;
const draftRecovery=window.PTI093DraftRecovery.install({state,$,getDateISO,setDateInput,render,renderLayout,setDriveState,msg,openLocalDraftDB,localDraftTransactionDone,getLocalDrafts});
const {scheduleAutoDraftSave,saveAutoDraft,finalizeCompletedSession,clearAutoDraft,restoreAutoDraft,clearAutoDraftTimer}=draftRecovery;
const localSaveCore=window.PTILocalSaveCore.install({state,$,snapshotGroupsForProject,openLocalDraftDB,localDraftTransactionDone,getDateISO,selectedGdv,setDriveState,msg,renderLocalSaveFeedback,showLocalSaveConfirm,clearAutoDraft});
const {saveLocalDraft,saveDraftWithoutPhotos}=localSaveCore;
$('driveSaveDraft').onclick=saveDraftWithoutPhotos;
const localOpenCore=window.PTI093LocalOpenCore.install({state,$,msg,openLocalDraftDB,setDateInput,render,renderLayout,setDriveState,deviceStorageLabel,setOpenLoad,finishOpenLoad});
const {openLocalDraft}=localOpenCore;

const driveSaveFusion=window.PTI093DriveFusion.install({state,$,msg,setDriveState,setOpenLoad,finishOpenLoad,getAllGroups,snapshotGroupsForProject,selectedGdv,scheduleAutoDraftSave,finalizeCompletedSession,getDateISO,setDateInput,render,renderLayout,deviceStorageLabel,searchQueryVariants,getLocalDrafts,openLocalDraft,normalizeRecordSearch,gdvSearchMatches,gdvInitials,wrap});
const {openRecordFromDrive,recordMatchesQuery,recordTime,sameLocalDriveRecord,searchDriveRecords,saveProjectToDrive,driveImageKey,getDriveUploadedKeys,saveDriveUploadedKeys,getDrivePendingUploadKey,saveDrivePendingUploadKey,prepareDriveItem,waitForUploadStatus,sendDrivePayload,renderDriveUploadFailures,createDriveRecord,pti093UploadAll}=driveSaveFusion;
window.pti093UploadAll=pti093UploadAll;
$('driveSearchBtn').onclick=searchDriveRecords;
$('driveSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchDriveRecords()});
$('driveSaveProject').onclick=async()=>{const b=$('driveSaveProject');b.disabled=true;try{const result=await pti093UploadAll();if(result&&result.failures&&result.failures.length)throw new Error('Còn ảnh chưa được xác nhận tải lên Drive.');if(result&&result.total>result.sent)throw new Error('Chưa xác nhận đủ ảnh trên Drive.');state.localDraftId='';await saveProjectToDrive();await finalizeCompletedSession();setDriveState('Đã lưu thay đổi hồ sơ. Ảnh hiện có đã được xác nhận trên Drive.')}catch(e){msg('Lỗi lưu thay đổi: '+e.message,true)}finally{b.disabled=false}};
$('driveCreate').onclick=createDriveRecord;

/* Draft session state moved to core/draft-recovery.js */
/* Draft session state moved to core/draft-recovery.js */
/* Draft session state moved to core/draft-recovery.js */
/* Draft recovery is implemented in core/draft-recovery.js */
/* Draft recovery is implemented in core/draft-recovery.js */
/* Draft recovery is implemented in core/draft-recovery.js */

/* Draft recovery is implemented in core/draft-recovery.js */
/* Draft recovery is implemented in core/draft-recovery.js */
// ===== KẾT THÚC PHIÊN LÀM VIỆC =====
// Khi GĐV đã xuất PDF hoặc đã lưu hồ sơ (Drive/Local), bản nháp tự động
// không còn cần để phục hồi lại ở lần mở app sau. Chỉ giữ lại GĐV để làm phiên mới.
/* Draft recovery is implemented in core/draft-recovery.js */

/* Draft recovery is implemented in core/draft-recovery.js */
/* Draft recovery is implemented in core/draft-recovery.js */

/* Classic Local Save UI is implemented in skin/classic-local-save.js */

window.pti093UploadAll = pti093UploadAll;



render();renderLayout();
['bks','hoso','gdv','date','garage'].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener('input',()=>scheduleAutoDraftSave(false));el.addEventListener('change',()=>scheduleAutoDraftSave(false))});
restoreAutoDraft();
window.addEventListener('pagehide',()=>{clearAutoDraftTimer();saveAutoDraft().catch(e=>console.warn('Không kịp tự lưu bản nháp:',e))});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearAutoDraftTimer();saveAutoDraft().catch(e=>console.warn('Không tự lưu bản nháp khi ẩn trang:',e))}});
