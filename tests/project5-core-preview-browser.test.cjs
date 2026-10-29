const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    const pageErrors=[];
    const requested=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('request',r=>requested.push(new URL(r.url()).pathname));
    await page.goto('http://127.0.0.1:4173/index.html?corePreview=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#counts .opt');
    await page.waitForSelector('#layoutPreview .layoutcell');
    const boot=await page.evaluate(()=>({
      previewMode:window.PROJECT5_CORE_PREVIEW===true,
      title:document.title,
      modernSkinEnabled:!document.getElementById('uiRefreshV42').disabled,
      modernGallery:!!document.querySelector('.pcImageGallery'),
      uiModeLabel:document.getElementById('uiModeToggle').textContent,
      classicGrid:!!window.PTI093ClassicImageGridSkin,
      imageIngest:!!window.PTI093ImageIngest,
      captionCore:!!window.PTI093CaptionTools,
      driveFusion:!!window.PTI093DriveFusion,
      driveUpload:typeof window.pti093UploadAll,
      driveBoxDisplay:getComputedStyle(document.querySelector('.driveBox')).display,
      driveButtonsVisible:['driveCreate','driveSaveProject','driveSaveDraft'].some(id=>{const e=document.getElementById(id);return e&&getComputedStyle(e).display!=='none';}),
      slots:document.querySelectorAll('#layoutPreview .layoutcell').length,
      datePlaceholder:document.getElementById('date').placeholder
    }));
    assert.equal(boot.previewMode,true,'Core Preview flag should be enabled from query string');
    assert.match(boot.title,/Core Preview/);
    assert.equal(boot.modernSkinEnabled,true,'Core Preview should default to the new UI skin');
    assert.equal(boot.modernGallery,true,'modern image gallery should mount in the acceptance preview');
    assert.equal(boot.uiModeLabel,'Giao diện Classic','new UI is active and the toggle should offer switching back');
    assert.equal(boot.classicGrid,true,'Classic image grid must initialize');
    assert.equal(boot.imageIngest,true,'image ingest core must initialize');
    assert.equal(boot.captionCore,true,'caption core must initialize');
    assert.equal(boot.driveFusion,false,'Drive Fusion script must not load in Core Preview');
    assert.equal(boot.driveUpload,'undefined','Drive upload entry must not be installed');
    assert.equal(boot.driveBoxDisplay,'none','Drive controls must be hidden in Core Preview');
    assert.equal(boot.driveButtonsVisible,false,'Drive action buttons must remain hidden in Core Preview');
    assert.equal(boot.slots,6,'default layout must retain six image slots');
    assert.equal(boot.datePlaceholder,'dd/mm/yyyy','date format must remain dd/mm/yyyy');
    assert.equal(requested.some(p=>p.endsWith('/fusion/drive.js')),false,'Drive module network request must not occur');
    await page.locator('#files').setInputFiles({
      name:'core-preview-smoke.svg',
      mimeType:'image/svg+xml',
      buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#087f45"/></svg>')
    });
    await page.waitForSelector('#grid .thumb');
    await page.locator('#finish').click();
    await page.waitForSelector('#preview .pageprev canvas',{timeout:15000});
    const preview=await page.evaluate(()=>({
      pages:document.querySelectorAll('#preview .pageprev canvas').length,
      pdfDisabled:document.getElementById('pdf').disabled,
      count:document.getElementById('previewInfo').textContent
    }));
    assert.equal(preview.pages,1,'one image should produce one preview page');
    assert.equal(preview.pdfDisabled,false,'PDF export should be enabled after preview');
    assert.match(preview.count,/1 nội dung · 1 ảnh/);
    const downloadPromise=page.waitForEvent('download',{timeout:20000});
    await page.locator('#pdf').click();
    const download=await downloadPromise;
    assert.ok(download.suggestedFilename().toLowerCase().endsWith('.pdf'),'PDF export should produce a PDF download');
    const closePreview=page.locator('#ptiPreviewClose');
    if(await closePreview.isVisible().catch(()=>false)) await closePreview.click();
    await page.waitForSelector('#pcSavedGroupsGallery textarea');
    const savedCaption=page.locator('#pcSavedGroupsGallery textarea').first();
    await savedCaption.fill('  kính   chắn gió. vỡ  ');
    assert.equal(await savedCaption.inputValue(),'Kính chắn gió. Vỡ ','modern saved-group caption auto-corrects silently during typing');
    await savedCaption.blur();
    assert.equal(await savedCaption.inputValue(),'Kính chắn gió. Vỡ','modern saved-group caption trims trailing whitespace on blur');
    assert.deepEqual(pageErrors,[],'Core Preview must start and process an image without uncaught browser errors');
    console.log('Core Preview browser smoke PASS: Modern UI skin, six-slot layout, image ingest, saved-group caption autocorrect, preview/PDF export, Drive controls hidden, and no Drive module loaded.');
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
