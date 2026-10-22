
const state={groups:[],current:{title:'Bản ảnh chi tiết thiệt hại',items:[]},editing:-1,per:6,orientation:'portrait',pages:[],pageDefs:[],addSeq:0,replaceIndex:-1,insertIndex:-1,filenameCaption:false,driveUploadFailures:[],localDraftId:''};
const PDF_SAFE_LIMIT=9.5*1048576;
const $=id=>document.getElementById(id); const drop=$('drop');
const classicLocalSaveSkin=window.PTI093ClassicLocalSaveSkin.install({document});
const {renderLocalSaveFeedback,showLocalSaveConfirm}=classicLocalSaveSkin;
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
const pdfExportCore=window.PTI093PdfExportCore.install({state,PDF_SAFE_LIMIT,drawPage,makePdfAt,pagePixels,jpegQuality,pdfPackSize});
const {splitHighQualityPdf}=pdfExportCore;
const {xmlEsc,b64Bytes,crc32,u16,u32,catBytes,zipStore,dataUrlBytes,unzipStore,textFile}=window.PTISharedCore;
const docxBuilder=window.PTI093DocxBuilder.install({xmlEsc,formatDateDMY});
const {docxText,docxCaption,drawingXml,pageBreak,makeDocxFiles}=docxBuilder;
const exts=/\.(jpe?g|png|webp|gif|heic|heif)$/i;
function msg(t,show=true){$('status').textContent=t;$('status').classList.toggle('hidden',!show)}
function selectedGdv(){let v=$('gdv').value;if(!v)return 'NONAME';if(v==='Nhập tên khác'){let x=$('gdv').dataset.custom||'';if(!x)x=prompt('Nhập tên GĐV / Thụ lý:','');if(x){v=x;$('gdv').dataset.custom=x;localStorage.setItem('pti093_gdv_custom',x)}else v='NONAME'}return v}
// ===== THỨ TỰ ẢNH: LUÔN GIỮ ĐÚNG THỨ TỰ GĐV THÊM ẢNH =====
// Không đọc EXIF, không đọc ngày chụp và không tự động sắp xếp theo thời gian.
// addSeq được gán ngay khi GĐV thêm ảnh; ảnh mới luôn nối vào cuối.
async function addFiles(fs){const candidates=[];for(const f of fs){if(!f.type.startsWith('image/')&&!exts.test(f.name))continue;const key=f.name+'|'+f.size+'|'+f.lastModified;if(!state.current.items.some(x=>x.key===key))candidates.push({file:f,key,caption:state.filenameCaption?fileBaseName(f.name):'',addSeq:++state.addSeq,rotate:0})}if(!candidates.length){msg('Không có ảnh mới để thêm.',true);return}state.current.items.push(...candidates);render();scheduleAutoDraftSave(true);msg(`Đã nhận ${candidates.length} ảnh. Thứ tự giữ nguyên theo thứ tự GĐV thêm ảnh.`,true)}
$('clear').onclick=()=>{if(!state.current.items.length)return;if(!confirm('Xóa toàn bộ ảnh của nội dung đang làm?'))return;state.current.items=[];render();scheduleAutoDraftSave(true);msg('Đã xóa ảnh của nội dung hiện tại.',true)};
$('files').addEventListener('change',e=>{addFiles([...e.target.files]);e.target.value=''});
$('folder').addEventListener('change',e=>{addFiles([...e.target.files]);e.target.value=''});
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();drop.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();if(ev==='dragleave')drop.classList.remove('drag') }));
drop.addEventListener('drop',e=>{drop.classList.remove('drag');addFiles([...e.dataTransfer.files])});
function render(){const g=$('grid');g.innerHTML='';state.current.items.forEach((it,i)=>{it.rotate=((it.rotate||0)%360+360)%360;const d=document.createElement('div');d.className='thumb';d.dataset.dragId=imageReorder.ensureDragId(it);d.title='Kéo ảnh để đổi thứ tự';d.draggable=true;
imageReorder.bindThumb(d,g);const imgBox=document.createElement('div');imgBox.className='imgBox';const im=document.createElement('img');im.src=URL.createObjectURL(it.file);im.style.transform=`rotate(${it.rotate}deg)`;im.onload=()=>URL.revokeObjectURL(im.src);imgBox.appendChild(im);const n=document.createElement('span');n.className='n';n.textContent=i+1;const actions=document.createElement('div');actions.className='thumbActions';const rb=document.createElement('button');rb.className='replace';rb.textContent='🖼 Thay';rb.title='Thay ảnh, giữ nguyên vị trí';rb.onclick=()=>{state.replaceIndex=i;$('replaceFile').click()};const rot=document.createElement('button');rot.className='rotate';rot.textContent='↻ Xoay';rot.title='Xoay ảnh 90°';rot.onclick=()=>{it.rotate=(it.rotate+90)%360;render();scheduleAutoDraftSave(true);msg(`Ảnh số ${i+1} đã xoay ${it.rotate}°.`,true)};const ins=document.createElement('button');ins.className='insert';ins.textContent='＋ Thêm';ins.title='Chèn ảnh mới ngay sau ảnh này';ins.onclick=()=>{state.insertIndex=i;$('insertFile').click()};const vw=document.createElement('button');vw.className='view';vw.textContent='👁️ Xem';vw.title='Xem ảnh kích thước lớn';vw.onclick=()=>openImageViewer(it,i);const b2=document.createElement('button');b2.className='del2';b2.textContent='🗑️ Xóa';b2.title='Xóa ảnh';b2.onclick=()=>{state.current.items.splice(i,1);render();scheduleAutoDraftSave(true)};actions.append(rb,rot,ins,vw,b2);const ta=document.createElement('textarea');ta.placeholder='Thuyết minh ảnh (tùy chọn)…';ta.value=it.caption;ta.oninput=()=>{it.caption=ta.value;scheduleAutoDraftSave(false)};ta.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const captions=[...g.querySelectorAll('.thumb textarea')],index=captions.indexOf(ta),next=index+(e.shiftKey?-1:1);if(next>=0&&next<captions.length){e.preventDefault();captions[next].focus()}});d.append(imgBox,n,actions,ta);g.appendChild(d)});const has=state.current.items.length>0;$('clear').disabled=!has;$('saveNext').disabled=!has;$('finish').disabled=!has&&!state.groups.length;renderGroups()}function renderGroups(){const box=$('groupsBox');box.innerHTML='';if(!state.groups.length){box.innerHTML='<div class="muted">Chưa có nội dung nào được lưu. Bạn có thể chỉ làm 1 nội dung và bấm “Kết thúc & xem Preview”.</div>';return}const h=document.createElement('div');h.className='muted';h.style.fontWeight='700';h.textContent='Các nội dung đã lưu';box.appendChild(h);state.groups.forEach((gr,i)=>{const d=document.createElement('div');d.style.cssText='margin-top:8px;padding:10px;border:1px solid #dbe4df;border-radius:8px;background:#fbfdfc;display:flex;justify-content:space-between;align-items:center;gap:8px';const sp=document.createElement('span');sp.innerHTML=`<b>${i+1}. ${gr.title}</b> · ${gr.items.length} ảnh`;const b=document.createElement('button');b.className='btn light';b.textContent='✎ Sửa';b.onclick=()=>editGroup(i);d.append(sp,b);box.appendChild(d)})}
function editGroup(i){if(state.current.items.length){if(!confirm('Mục hiện tại chưa lưu. Bỏ mục hiện tại để sửa mục đã lưu?'))return}state.current={title:state.groups[i].title,items:state.groups[i].items};state.filenameCaption=false;$('filenameCaption').checked=false;$('filenameCaption').closest('.filenameCaptionBox').classList.remove('on');state.groups.splice(i,1);state.editing=i;state.pages=[];$('preview').innerHTML='';$('previewInfo').textContent='Preview cũ đã được hủy vì hồ sơ đang được chỉnh sửa.';scheduleAutoDraftSave(true);$('pdf').disabled=true;$('backEdit').style.display='none';$('newCase').style.display='none';$('title').value=state.current.title;render();window.scrollTo({top:$('drop').getBoundingClientRect().top+scrollY-100,behavior:'smooth'})}
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

function renderLayout(){const box=$('layoutPreview'),txt=$('layoutText');if(!box)return;const d=layoutDims();box.style.gridTemplateColumns=`repeat(${d.cols},1fr)`;box.innerHTML='';for(let i=0;i<state.per;i++){const c=document.createElement('div');c.className='layoutcell';c.textContent=i+1;box.appendChild(c)}txt.textContent=`${state.per} ảnh · ${state.orientation==='portrait'?'A4 dọc':'A4 ngang'} · ${d.cols} × ${d.rows}`;}
[1,2,3,4,6,8].forEach(n=>{const b=document.createElement('button');b.className='opt'+(n===6?' on':'');b.textContent=n;b.onclick=()=>{state.per=n;document.querySelectorAll('#counts .opt').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderLayout();scheduleAutoDraftSave(false)};$('counts').appendChild(b)});
document.querySelectorAll('#orient .opt').forEach(b=>b.onclick=()=>{state.orientation=b.dataset.o;document.querySelectorAll('#orient .opt').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderLayout();scheduleAutoDraftSave(false)});
// V39: render bố cục ngay sau khi tạo các nút lựa chọn, không phụ thuộc render() hoặc khôi phục bản nháp.
// Nhờ đó vừa mở trang đã thấy đúng 6 ảnh A4 dọc (2 × 3), không cần bấm lại nút 6.
renderLayout();




const logoSrc=document.querySelector('.logo').src;

let selectedGdvCache='';



async function makePreview(){selectedGdvCache=selectedGdv();$('backEdit').style.display='none';$('newCase').style.display='none';hidePdfWarning();const groups=getAllGroups();if(!groups.length){msg('Chưa có ảnh để Preview.',true);return}const pages=[],defs=[];let no=1;for(const gr of groups){const total=Math.ceil(gr.items.length/state.per);for(let i=0;i<gr.items.length;i+=state.per){
      const pageItems=gr.items.slice(i,i+state.per);
      const pageNo=no++;
      const groupPageNo=Math.floor(i/state.per)+1;
      const def={group:gr,pageItems,pageNo,groupPageNo,groupPages:total,groupStartIndex:i};
      defs.push(def);
      // i là vị trí tuyệt đối trong toàn bộ loại ảnh, không phải vị trí trong trang.
      pages.push(await drawPage(gr,pageItems,pageNo,groupPageNo,total,i));
    }}state.pages=pages;state.pageDefs=defs;$('preview').innerHTML='';pages.forEach((c,i)=>{const d=document.createElement('div');d.className='pageprev';const t=document.createElement('div');t.className='muted';t.textContent=`Trang ${i+1}`;d.append(t,c);$('preview').appendChild(d)});$('previewInfo').textContent=`Preview ${pages.length} trang A4 · ${groups.length} nội dung · ${groups.reduce((a,g)=>a+g.items.length,0)} ảnh · tối ưu ${pagePixels().dpi} DPI / JPEG ${Math.round(jpegQuality()*100)}%`;$('pdf').disabled=false;$('newCase').style.display='inline-block';window.scrollTo({top:$('preview').getBoundingClientRect().top+scrollY-80,behavior:'smooth'})}


function mib(n){return n/1048576}




function hidePdfWarning(){const box=$('pdfWarn');if(box){box.classList.add('hidden');box.innerHTML='';}}
function showPdfWarning(message,baseName){
  const box=$('pdfWarn');if(!box)return;
  box.classList.remove('hidden');
  box.innerHTML='<strong>⚠️ PDF phải nén ảnh để giữ dung lượng dưới 10 MB.</strong><div style="margin-top:5px">'+message+'</div><div style="margin-top:7px">Sau khi xuất, nên mở lại file PDF và kiểm tra độ rõ của ảnh, đặc biệt ảnh số khung, tem đăng kiểm và chi tiết thiệt hại.</div>';
  const label=document.createElement('label');
  const cb=document.createElement('input');cb.type='checkbox';cb.id='pdfHighQualityCheck';
  const span=document.createElement('span');span.textContent='Tách PDF thành nhiều file để giữ chất lượng ảnh cao hơn (tự động xuất khi tick).';
  label.append(cb,span);box.appendChild(label);
  const progressWrap=document.createElement('div');progressWrap.id='pdfHighProgressWrap';progressWrap.style.cssText='display:none;margin:10px 0;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff';
  const progressTop=document.createElement('div');progressTop.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:700;margin-bottom:6px';
  const progressLabel=document.createElement('span');progressLabel.id='pdfHighProgressLabel';progressLabel.textContent='Đang chuẩn bị…';
  const progressPct=document.createElement('span');progressPct.id='pdfHighProgressPct';progressPct.textContent='0%';
  progressTop.append(progressLabel,progressPct);
  const progressTrack=document.createElement('div');progressTrack.style.cssText='height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden';
  const progressBar=document.createElement('div');progressBar.id='pdfHighProgressBar';progressBar.style.cssText='height:100%;width:0%;background:#07834f;border-radius:999px;transition:width .18s ease';
  progressTrack.appendChild(progressBar);
  const progress=document.createElement('div');progress.id='pdfHighProgress';progress.className='status';progress.style.cssText='margin-top:7px;font-size:13px';progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
  progressWrap.append(progressTop,progressTrack,progress);box.appendChild(progressWrap);
  const b=document.createElement('button');b.type='button';b.className='btn green pdfHighBtn';b.textContent='📄 Xuất PDF chất lượng cao · tự tách file';
  b.onclick=()=>exportHighQualitySplit(baseName,b,progress);
  box.appendChild(b);
  cb.addEventListener('change',()=>{if(cb.checked)exportHighQualitySplit(baseName,b,progress)});
}
let pdfHighQualityRunning=false;
async function exportHighQualitySplit(filenameBase,button,progress){
  if(pdfHighQualityRunning)return;
  if(!state.pages||!state.pages.length){msg('Không có trang PDF để xuất.',true);return}
  pdfHighQualityRunning=true;if(button)button.disabled=true;
  const checkbox=$('pdfHighQualityCheck');if(checkbox)checkbox.disabled=true;
  const wrap=$('pdfHighProgressWrap'),label=$('pdfHighProgressLabel'),pct=$('pdfHighProgressPct'),bar=$('pdfHighProgressBar');
  if(wrap)wrap.style.display='block';
  const update=(percent,text)=>{const p=Math.max(0,Math.min(100,Math.round(percent)));if(progress)progress.textContent=text;if(label)label.textContent=text;if(pct)pct.textContent=p+'%';if(bar)bar.style.width=p+'%';msg(p+'% · '+text,true)};
  try{
    update(2,'Đang chuẩn bị xuất PDF chất lượng cao…');await new Promise(resolve=>setTimeout(resolve,40));
    const parts=await splitHighQualityPdf(filenameBase,update);
    if(!parts.length)throw new Error('Không tạo được tệp PDF nào.');
    for(let i=0;i<parts.length;i++){
      update(80+Math.round(i/parts.length*19),'Đang xuất tệp '+(i+1)+'/'+parts.length+' · '+parts[i].filename+' ('+mib(parts[i].blob.size).toFixed(2)+' MB)…');
      await new Promise(resolve=>setTimeout(resolve,80));await exportPdfFile(parts[i].blob,parts[i].filename);
      update(80+Math.round((i+1)/parts.length*19),'Đã gửi '+(i+1)+'/'+parts.length+' tệp PDF để lưu.');
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    update(100,'Hoàn tất gửi '+parts.length+' tệp PDF. Kiểm tra thư mục Tải xuống hoặc hộp thoại Chia sẻ.');
  }catch(e){const message='Xuất PDF chất lượng cao bị gián đoạn: '+(e&&e.message?e.message:String(e))+'. Hãy kiểm tra các tệp đã lưu trước khi thử lại.';update(100,message);alert(message)}
  finally{pdfHighQualityRunning=false;if(button)button.disabled=false;if(checkbox)checkbox.disabled=false}
}

// ===== Word draft (PC only) =====
const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
async function imageForDocx(file,angle=0){const im=await loadImage(file),max=1800,a=((angle||0)%360+360)%360,swap=(a===90||a===270),sc=Math.min(1,max/Math.max(im.width,im.height)),iw=Math.max(1,Math.round(im.width*sc)),ih=Math.max(1,Math.round(im.height*sc)),w=swap?ih:iw,h=swap?iw:ih,c=makeCanvas(w,h),x=c.getContext('2d');x.translate(w/2,h/2);x.rotate(a*Math.PI/180);x.drawImage(im,-iw/2,-ih/2,iw,ih);return {bytes:dataUrlBytes(c.toDataURL('image/jpeg',0.88)),w,h}}
async function saveDocx(){const groups=getAllGroups();if(!groups.length){alert('Chưa có ảnh để lưu bản nháp.');return}const gdv=selectedGdv(),meta={version:2,app:'PTI_GhepAnhXe',gdv,bks:$('bks').value,hoso:$('hoso').value,date:getDateISO(),garage:$('garage').value,orientation:state.orientation,per:state.per,groups:groups.map(g=>({title:g.title,items:g.items.map(it=>({caption:it.caption||'',name:it.file.name,size:it.file.size,lastModified:it.file.lastModified,addSeq:it.addSeq||null,rotate:it.rotate||0}))}))};const media=[];for(let i=0;i<groups.length;i++)for(let j=0;j<groups[i].items.length;j++){const x=await imageForDocx(groups[i].items[j].file,groups[i].items[j].rotate||0);media.push({name:`image${media.length+1}.jpg`,bytes:x.bytes,w:x.w,h:x.h})}const p=makeDocxFiles(meta,media),files=[{name:'[Content_Types].xml',data:new TextEncoder().encode(p.content)},{name:'_rels/.rels',data:new TextEncoder().encode(p.rootrels)},{name:'word/document.xml',data:new TextEncoder().encode(p.documentXml)},{name:'word/_rels/document.xml.rels',data:new TextEncoder().encode(p.relXml)},{name:'docProps/core.xml',data:new TextEncoder().encode(p.core)},{name:'customXml/item1.xml',data:new TextEncoder().encode(p.custom)}];for(const m of media)files.push({name:'word/media/'+m.name,data:m.bytes});const out=zipStore(files),blob=new Blob([out],{type:DOCX_MIME}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`PTI_Nhap_${($('bks').value||'GhepAnh').replace(/[^\w.-]+/g,'_')}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);msg('Đã tạo bản nháp Word. Có thể mở lại bằng “Mở bản nháp Word”.',true)}
async function openDocxFile(file){try{const files=unzipStore(await file.arrayBuffer()),raw=textFile(files,'customXml/item1.xml'),m=raw.match(/<!\[CDATA\[(.*?)\]\]>/s);if(!m)throw new Error('Không tìm thấy dữ liệu hồ sơ PTI trong file Word.');const meta=JSON.parse(m[1]);if(meta.app!=='PTI_GhepAnhXe')throw new Error('Đây không phải bản nháp PTI được tạo từ phần mềm.');const media=Object.keys(files).filter(k=>/^word\/media\/image\d+\.jpg$/i.test(k)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));let mi=0;const groups=[];for(const gr of meta.groups){const items=[];for(const it of gr.items){const bytes=files[media[mi++]];if(!bytes)throw new Error('Thiếu ảnh trong bản nháp.');const blob=new Blob([bytes],{type:'image/jpeg'});items.push({file:new File([blob],it.name||`image${mi}.jpg`,{type:'image/jpeg',lastModified:it.lastModified||Date.now()}),key:(it.name||'')+'|'+(it.size||0)+'|'+(it.lastModified||0),caption:it.caption||'',addSeq:it.addSeq||++state.addSeq,rotate:it.rotate||0})}groups.push({title:gr.title,items})}state.groups=groups;state.addSeq=Math.max(0,...groups.flatMap(g=>g.items.map(it=>it.addSeq||0)));state.current={title:'Bản ảnh hiện trường',items:[]};state.orientation=meta.orientation||'landscape';state.per=meta.per||4;$('gdv').value=meta.gdv||'';if($('gdv').value==='Nhập tên khác')$('gdv').dataset.custom=meta.gdv;$('bks').value=meta.bks||'';$('hoso').value=meta.hoso||'';setDateInput(meta.date||'');$('garage').value=meta.garage||'';document.querySelectorAll('#counts .opt').forEach(x=>x.classList.toggle('on',Number(x.textContent)===state.per));document.querySelectorAll('#orient .opt').forEach(x=>x.classList.toggle('on',x.dataset.o===state.orientation));

render();renderLayout();await makePreview();msg(`Đã mở bản nháp: ${groups.length} nội dung · ${groups.reduce((a,g)=>a+g.items.length,0)} ảnh.`,true)}catch(e){alert('Không mở được bản nháp Word: '+e.message)}}
// Bản nháp Word đã được thay thế bằng project.pti trên Google Drive.

async function exportPdfFile(blob,filename){
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  let url='';
  try{
    if(isiOS){
      // Ưu tiên chia sẻ một File có tên rõ ràng để iOS giữ đúng tên PDF.
      // Nếu trình duyệt không hỗ trợ chia sẻ tệp, mở PDF như phương án dự phòng.
      const file=new File([blob],filename,{type:'application/pdf'});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:filename});
        return;
      }
      url=URL.createObjectURL(blob);
      const w=window.open(url,'_blank');
      if(!w) location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      return;
    }
    url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }catch(e){
    if(url)URL.revokeObjectURL(url);
    if(e&&e.name==='AbortError')return;
    throw e;
  }
}
$('pdf').onclick=async()=>{
  if(!state.pages.length)return;
  const btn=$('pdf');btn.disabled=true;
  try{
    const baseName=pdfFileName();
    msg('Đang kiểm tra dung lượng PDF...',true);
    const result=await buildAdaptivePdf(state.pages);
    const size=mib(pdfPackSize(result.bytes));
    if(!result.compressed){
      const blob=new Blob([result.bytes],{type:'application/pdf'});
      await exportPdfFile(blob,baseName);
      $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
      msg('Đã xuất PDF '+size.toFixed(2)+' MB · không cần nén ảnh · '+result.dpi+' DPI · JPEG '+Math.round(result.quality*100)+'%.',true);
      hidePdfWarning();
      await finalizeCompletedSession();
    }else{
      // Xuất bản nén an toàn và đồng thời cảnh báo để GĐV kiểm tra lại ảnh.
      const blob=new Blob([result.bytes],{type:'application/pdf'});
      await exportPdfFile(blob,baseName);
      $('backEdit').style.display='inline-block';$('newCase').style.display='inline-block';
      msg('Đã xuất PDF '+size.toFixed(2)+' MB bằng chế độ nén. Vui lòng kiểm tra lại bản ảnh sau khi xuất.',true);
      showPdfWarning('Dung lượng bản PDF ở chất lượng cao không phù hợp giới hạn 10 MB nên phần mềm đã nén ảnh. Bạn có thể xuất lại ở chất lượng cao; phần mềm sẽ tự tách thành nhiều file.',baseName);
      await finalizeCompletedSession();
    }
  }catch(e){
    msg('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)),false);
    alert('Không thể xuất PDF: '+(e&&e.message?e.message:String(e)));
  }finally{btn.disabled=false}
};
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
function setDriveState(t,ok=true){const s=$('driveState');if(!s)return;s.textContent=t;s.className='driveState'+(ok?'':' driveWarn')}






function openImageViewer(it,index){
  if(!it||!it.file)return;
  const old=document.querySelector('.pti093Viewer');if(old)old.remove();
  const url=URL.createObjectURL(it.file);
  const wrap=document.createElement('div');wrap.className='pti093Viewer';
  const title=document.createElement('div');title.className='pti093ViewerTitle';title.textContent='Ảnh số '+(Number(index)+1);
  const img=document.createElement('img');img.src=url;img.alt='Ảnh số '+(Number(index)+1);img.style.transform='rotate('+(((it.rotate||0)%360+360)%360)+'deg)';
  const close=document.createElement('button');close.className='pti093ViewerClose';close.type='button';close.textContent='×';close.title='Đóng';
  const cleanup=()=>{URL.revokeObjectURL(url);wrap.remove();document.removeEventListener('keydown',onKey)};
  const onKey=e=>{if(e.key==='Escape')cleanup()};
  close.onclick=cleanup;
  wrap.addEventListener('click',e=>{if(e.target===wrap)cleanup()});
  wrap.append(title,img,close);document.body.appendChild(wrap);document.addEventListener('keydown',onKey);
}
function deviceStorageLabel(){
  const ua=navigator.userAgent||'';
  if(/iPhone|iPad|iPod/i.test(ua))return 'iPhone/iPad';
  if(/Android/i.test(ua))return 'điện thoại Android';
  return 'PC';
}
function setOpenLoad(source,index,total,detail){
  const box=$('openLoadBox'),bar=$('openLoadBar'),txt=$('openLoadText'),pct=$('openLoadPct'),meta=$('openLoadMeta');
  if(!box)return;
  box.classList.remove('hidden');
  const safeTotal=Math.max(0,Number(total)||0),safeIndex=Math.max(0,Number(index)||0);
  const p=safeTotal?Math.min(100,Math.round(safeIndex*100/safeTotal)):0;
  bar.style.width=p+'%';pct.textContent=p+'%';
  txt.textContent=detail||('Đang tải dữ liệu từ '+source+'...');
  meta.textContent=safeTotal?'Đã tải '+safeIndex+'/'+safeTotal+' ảnh · '+source:'Đang kết nối '+source+'...';
}

function finishOpenLoad(source,total){
  const box=$('openLoadBox'),bar=$('openLoadBar'),txt=$('openLoadText'),pct=$('openLoadPct'),meta=$('openLoadMeta');
  if(!box)return;
  box.classList.remove('hidden');bar.style.width='100%';pct.textContent='100%';
  txt.textContent='✓ Đã tải hoàn tất từ '+source;
  meta.textContent='Hoàn tất '+(Number(total)||0)+' ảnh · Có thể tiếp tục chỉnh sửa.';
}

const normalizeRecordSearch=window.PTISharedCore.normalizeRecordSearch;
const PTI093_GDV_NAMES=['Phạm Duy Thái','Đặng Xuân Linh','Nguyễn Tuấn Hưng','Đặng Xuân Diệu','Đặng Văn Hiên','Nguyễn Minh Ngọc'];
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
