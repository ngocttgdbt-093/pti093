
const state={groups:[],current:{title:'Bản ảnh chi tiết thiệt hại',items:[]},editing:-1,per:6,orientation:'portrait',rowGap:18,columnGap:18,pages:[],pageDefs:[],addSeq:0,replaceIndex:-1,insertIndex:-1,filenameCaption:false,driveUploadFailures:[],driveRecordId:'',localDraftId:'',driveOpenIncomplete:false,driveOpenPending:false,workspaceOpenPending:false,workspaceRevision:0,localCopyFromIncompleteDrive:false};
const PDF_SAFE_LIMIT=9.5*1048576;
const fileDelivery=window.PTI093FileDelivery.install({navigator,window,document,URL,File,location,setTimeout});
const {exportPdfFile}=fileDelivery;
const $=id=>document.getElementById(id);
// Storage is a preference/draft convenience, not a prerequisite for starting the app.
// Access the browser storage property itself inside try/catch because some privacy policies throw on access.
const safeLocalStorage={
  getItem(key){try{return window.localStorage.getItem(key)}catch(e){return null}},
  setItem(key,value){try{window.localStorage.setItem(key,value)}catch(e){}},
  removeItem(key){try{window.localStorage.removeItem(key)}catch(e){}}
};
const gdvFusion=window.PTI093GdvFusion.install({$,prompt,storage:safeLocalStorage,state});
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
const deviceContext=window.PTI093DeviceContext.install({navigator});
const {deviceStorageLabel}=deviceContext;
const workspaceCore=window.PTIWorkspaceCore;
const getAllGroups=()=>workspaceCore.getAllGroups(state);
const fileNaming=window.PTI093FileNaming.install({getAllGroups,$,selectedGdv});
const {fileBaseName,fileKey,pdfFileName}=fileNaming;
const imageReorder=window.PTI093ImageReorder.install({state,$,scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),renderLayout:()=>renderLayout(),render:()=>render()});
const snapshotGroupsForProject=()=>workspaceCore.snapshotGroupsForProject(state);
const pdfBuilder=window.PTI093PdfBuilder.install({state,PDF_SAFE_LIMIT});
const {pagePixels,jpegQuality,makeCanvas,pdfPackSize,makePdfAt,buildAdaptivePdf}=pdfBuilder;
const imageCanvasCore=window.PTI093ImageCanvasCore.install({state,$,pagePixels,makeCanvas,formatDateDMY,getDateISO,getLogoSrc:()=>logoSrc,getSelectedGdvCache:()=>selectedGdvCache});
const {layoutDims,wrap,drawPage}=imageCanvasCore;
const previewBuilder=window.PTI093PreviewBuilder.install({drawPage});
const {buildPreview}=previewBuilder;
const classicLayoutSkin=window.PTI093ClassicLayoutSkin.install({state,$,layoutDims,document,scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args)});
classicLayoutSkin.bindControls();
const groupWorkflow=window.PTI093GroupWorkflow.install({state,$,workspaceCore,render:()=>render(),makePreview:()=>makePreview(),scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),msg,confirm,window});
const classicGroupListSkin=window.PTI093ClassicGroupListSkin.install({state,$,document,onEditGroup:i=>groupWorkflow.editGroup(i)});
const classicImageGridSkin=window.PTI093ClassicImageGridSkin.install({
  state,$,document,URL,imageReorder,openImageViewer,renderGroups:()=>renderGroups(),
  scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),msg,
  onReplace:i=>imageEditing.beginReplace(i),
  onRotate:(item,index)=>imageEditing.rotate(item,index),
  onInsert:i=>imageEditing.beginInsert(i),
  onDelete:i=>imageEditing.deleteCurrent(i),
  onCaptionChange:(item,value)=>imageEditing.captionChange(item,value)
});
const pdfExportCore=window.PTI093PdfExportCore.install({state,PDF_SAFE_LIMIT,drawPage,makePdfAt,pagePixels,jpegQuality,pdfPackSize});
const {splitHighQualityPdf}=pdfExportCore;
const pdfExportController=window.PTI093PdfExportController.install({state,$,splitHighQualityPdf,exportPdfFile,msg,alert,setTimeout,buildAdaptivePdf,pdfPackSize,pdfFileName,getPdfWarningSkin:()=>classicPdfWarningSkin,finalizeCompletedSession:()=>finalizeCompletedSession()});
const {exportHighQualitySplit}=pdfExportController;
const classicPdfWarningSkin=window.PTI093ClassicPdfWarningSkin.install({$,document,exportHighQualitySplit});
const {hidePdfWarning}=classicPdfWarningSkin;
const classicPreviewSkin=window.PTI093ClassicPreviewSkin.install({state,$,document,window,buildPreview,getAllGroups,selectedGdv,setSelectedGdvCache:value=>{selectedGdvCache=value;},hidePdfWarning,msg,pagePixels,jpegQuality,setTimeout});
const {makePreview}=classicPreviewSkin;
const exts=/\.(jpe?g|png|webp|gif|heic|heif)$/i;
// ===== THỨ TỰ ẢNH: LUÔN GIỮ ĐÚNG THỨ TỰ GĐV THÊM ẢNH =====
// Không đọc EXIF, không đọc ngày chụp và không tự động sắp xếp theo thời gian.
// addSeq được gán ngay khi GĐV thêm ảnh; ảnh mới luôn nối vào cuối.
const imageIngest=window.PTI093ImageIngest.install({state,exts,fileBaseName,fileKey,scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),render:()=>render(),msg});
const {addFiles}=imageIngest;
const caseEditor=window.PTI093CaseEditor.install({state,$,fileBaseName,render:()=>render(),scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),msg});
caseEditor.bindControls();
const imageEditing=window.PTI093ImageEditing.install({state,$,exts,fileBaseName,fileKey,render:()=>render(),scheduleAutoDraftSave:(...args)=>scheduleAutoDraftSave(...args),msg,confirm});
window.PTI093ClassicFileIntakeSkin.install({$,addFiles});
function render(){return classicImageGridSkin.render()}function renderGroups(){return classicGroupListSkin.renderGroups()}

/* Shared workspace group helper is in core/workspace.js */
/* Shared workspace snapshot helper is in core/workspace.js */

function renderLayout(){return classicLayoutSkin.renderLayout()}
// V39: render bố cục ngay sau khi tạo các nút lựa chọn, không phụ thuộc render() hoặc khôi phục bản nháp.
// Nhờ đó vừa mở trang đã thấy đúng 6 ảnh A4 dọc (2 × 3), không cần bấm lại nút 6.
renderLayout();

const logoSrc=document.querySelector('.logo').src;

let selectedGdvCache='';

pdfExportController.bindControls();
// Ghi nhớ GĐV/thụ lý để nút 'Làm tiếp bản ảnh khác' tải lại trang nhưng vẫn giữ gợi ý.
gdvFusion.bindSelectionPersistence((...args)=>scheduleAutoDraftSave(...args));

/* Drive record/search/upload behavior is installed from fusion/drive.js below. */

const normalizeRecordSearch=window.PTISharedCore.normalizeRecordSearch;
const gdvInitials=window.PTISharedCore.gdvInitials;
const gdvSearchMatches=window.PTISharedCore.gdvSearchMatches;
const searchQueryVariants=query=>window.PTISharedCore.searchQueryVariants(query,PTI093_GDV_NAMES);

const localDraftStore=window.PTILocalDraftStore.install({dbName:'pti093_local_drafts_v1'});
const {openLocalDraftDB,localDraftTransactionDone,getLocalDrafts}=localDraftStore;
const draftStorage=window.PTIDraftStorageContract.install({provider:localDraftStore});
const draftRecovery=window.PTI093DraftRecovery.install({state,$,getDateISO,setDateInput,render,renderLayout,setDriveState,msg,openLocalDraftDB,localDraftTransactionDone,draftStorage,fileKey});
const {scheduleAutoDraftSave,finalizeCompletedSession,clearAutoDraft,bindLifecycle}=draftRecovery;
window.PTI093SessionActions.install({$,clearAutoDraft,localStorage:safeLocalStorage,location,console,msg});
const localSaveCore=window.PTILocalSaveCore.install({state,$,snapshotGroupsForProject,openLocalDraftDB,localDraftTransactionDone,draftStorage,getDateISO,selectedGdv,setDriveState,msg,renderLocalSaveFeedback,showLocalSaveConfirm,clearAutoDraft});
localSaveCore.bindControls();
const localOpenCore=window.PTI093LocalOpenCore.install({state,$,msg,openLocalDraftDB,draftStorage,setDateInput,render,renderLayout,setDriveState,deviceStorageLabel,setOpenLoad,finishOpenLoad,scheduleAutoDraftSave,fileKey});
const {openLocalDraft}=localOpenCore;

const driveSaveFusion=window.PTI093DriveFusion.install({state,$,msg,setDriveState,setOpenLoad,finishOpenLoad,getAllGroups,snapshotGroupsForProject,selectedGdv,scheduleAutoDraftSave,finalizeCompletedSession,getDateISO,setDateInput,render,renderLayout,deviceStorageLabel,searchQueryVariants,getLocalDrafts,openLocalDraft,normalizeRecordSearch,gdvSearchMatches,gdvInitials,wrap});
driveSaveFusion.bindControls();

// Session lifecycle and autosave recovery are owned by core/draft-recovery.js.

/* Classic Local Save UI is implemented in skin/classic-local-save.js */

render();renderLayout();bindLifecycle();
