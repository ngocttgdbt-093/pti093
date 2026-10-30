const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#counts .opt');
    await page.waitForSelector('#layoutPreview .layoutcell');
    const initial=await page.evaluate(()=>({
      counts:document.querySelectorAll('#counts .opt').length,
      layoutCells:document.querySelectorAll('#layoutPreview .layoutcell').length,
      layoutText:document.getElementById('layoutText').textContent,
      datePlaceholder:document.getElementById('date').placeholder,
      modules:{
        date:!!window.PTI093DateUtils,
        naming:!!window.PTI093FileNaming,
        reorder:!!window.PTI093ImageReorder,
        pdf:!!window.PTI093PdfBuilder,
        canvas:!!window.PTI093ImageCanvasCore,
        localSaveSkin:!!window.PTI093ClassicLocalSaveSkin,
        loadProgressSkin:!!window.PTI093ClassicLoadProgressSkin,
        imageViewerSkin:!!window.PTI093ClassicImageViewerSkin,
        statusSkin:!!window.PTI093ClassicStatusSkin,
        layoutSkin:!!window.PTI093ClassicLayoutSkin,
        groupListSkin:!!window.PTI093ClassicGroupListSkin,
        imageGridSkin:!!window.PTI093ClassicImageGridSkin,
        pdfWarningSkin:!!window.PTI093ClassicPdfWarningSkin,
        gdvFusion:!!window.PTI093GdvFusion,
        imageIngest:!!window.PTI093ImageIngest,
        imageEditing:!!window.PTI093ImageEditing,
        fileIntakeSkin:!!window.PTI093ClassicFileIntakeSkin,
        previewSkin:!!window.PTI093ClassicPreviewSkin,
        groupWorkflow:!!window.PTI093GroupWorkflow,
        driveBindings:typeof document.getElementById('driveSearchBtn').onclick==='function' && typeof document.getElementById('driveSaveProject').onclick==='function' && typeof document.getElementById('driveCreate').onclick==='function',
        driveUploadEntry:typeof window.pti093UploadAll==='function',
        sessionActions:!!window.PTI093SessionActions && typeof document.getElementById('newCase').onclick==='function',
        deviceContext:!!window.PTI093DeviceContext,
        previewModal:typeof window.pti093ClosePreview==='function'
      }
    }));
    assert.equal(initial.counts,6,'six image-count choices should be rendered');
    assert.equal(initial.layoutCells,6,'default layout should show six image slots');
    assert.match(initial.layoutText,/6 ảnh/);
    assert.equal(initial.datePlaceholder,'dd/mm/yyyy');
    assert.deepEqual(initial.modules,{date:true,naming:true,reorder:true,pdf:true,canvas:true,localSaveSkin:true,loadProgressSkin:true,imageViewerSkin:true,statusSkin:true,layoutSkin:true,groupListSkin:true,imageGridSkin:true,pdfWarningSkin:true,gdvFusion:true,imageIngest:true,imageEditing:true,fileIntakeSkin:true,previewSkin:true,groupWorkflow:true,driveBindings:true,driveUploadEntry:true,sessionActions:true,deviceContext:true,previewModal:true});
    await page.locator('#date').fill('01012026');
    assert.equal(await page.locator('#date').inputValue(),'01/01/2026','real app date mask should insert separators');
    await page.locator('#files').setInputFiles({
      name:'preview-smoke.svg',
      mimeType:'image/svg+xml',
      buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#087f45"/></svg>')
    });
    await page.waitForSelector('#grid .thumb');
    await page.locator('#finish').click();
    await page.waitForSelector('#preview .pageprev canvas',{timeout:15000});
    const preview=await page.evaluate(()=>({
      pages:document.querySelectorAll('#preview .pageprev canvas').length,
      info:document.getElementById('previewInfo').textContent,
      pdfDisabled:document.getElementById('pdf').disabled
    }));
    assert.equal(preview.pages,1,'finishing one image should render one preview page');
    assert.match(preview.info,/1 nội dung · 1 ảnh/);
    assert.equal(preview.pdfDisabled,false,'PDF export must be enabled after preview generation');
    const downloadPromise=page.waitForEvent('download',{timeout:20000});
    await page.locator('#pdf').click();
    const download=await downloadPromise;
    assert.ok(download.suggestedFilename().toLowerCase().endsWith('.pdf'),'preview pages should reach the PDF export path');
    await page.waitForSelector('#ptiPreviewModal.open',{timeout:5000});
    assert.equal(await page.locator('#ptiPreviewModal').getAttribute('aria-modal'),'true','Preview overlay should be accessible as a modal dialog');
    await page.locator('#ptiPreviewClose').click();
    await page.waitForFunction(()=>{const modal=document.getElementById('ptiPreviewModal');return modal&&!modal.classList.contains('open');});
    assert.deepEqual(pageErrors,[],'the full app should start without uncaught JavaScript errors');

    const modernPage=await browser.newPage();
    const modernErrors=[];
    modernPage.on('pageerror',e=>modernErrors.push(e.message));
    await modernPage.addInitScript(()=>{
      localStorage.setItem('pti093_ui_default_classic_v2','1');
      localStorage.setItem('pti093_ui_mode','modern');
    });
    await modernPage.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await modernPage.waitForSelector('.pcImageGallery',{timeout:5000});
    const modernGallery=await modernPage.evaluate(()=>({
      classic:document.body.classList.contains('classic-ui'),
      galleryCount:document.querySelectorAll('.pcImageGallery').length,
      gridInsideGallery:!!document.querySelector('.pcImageGallery #grid'),
      countLabel:document.getElementById('pcGalleryCount')?.textContent,
      renderer:typeof window.pti093RenderSavedGroupsGallery
    }));
    assert.equal(modernGallery.classic,false,'saved Modern preference should activate the Modern skin');
    assert.equal(modernGallery.galleryCount,1,'Modern Image Gallery Skin should mount once');
    assert.equal(modernGallery.gridInsideGallery,true,'the image grid should be placed inside the gallery');
    assert.equal(modernGallery.countLabel,'Chưa có ảnh');
    assert.equal(modernGallery.renderer,'function','gallery renderer should remain available to Preview Skin');
    await modernPage.locator('#files').setInputFiles({
      name:'modern-selection-smoke.svg',
      mimeType:'image/svg+xml',
      buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#087f45"/></svg>')
    });
    await modernPage.waitForSelector('.pcImageGallery #grid .thumb');
    await modernPage.locator('.pcImageGallery #grid .thumb .imgBox').first().click();
    await modernPage.locator('#p5BulkCaption').click();
    await modernPage.locator('#p5CaptionInput').fill('modern skin caption');
    await modernPage.locator('#p5CaptionApply').click();
    assert.equal(await modernPage.locator('.pcImageGallery #grid .thumb.p5-selected').count(),0,
      'Modern skin must use the shared successful-apply auto-clear adapter');
    assert.equal(await modernPage.evaluate(()=>state.current.items[0].caption),'Modern skin caption');

    assert.deepEqual(modernErrors,[],'Modern skin should mount without uncaught JavaScript errors');
    await modernPage.close();

    const blockedStoragePage=await browser.newPage();
    const blockedStorageErrors=[];
    blockedStoragePage.on('pageerror',e=>blockedStorageErrors.push(e.message));
    await blockedStoragePage.addInitScript(()=>{
      Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('storage blocked','SecurityError')}});
      Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('storage blocked','SecurityError')}});
    });
    await blockedStoragePage.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await blockedStoragePage.waitForSelector('#layoutPreview .layoutcell',{timeout:5000});
    assert.equal(await blockedStoragePage.locator('#counts .opt').count(),6,
      'app should finish startup even if browser storage properties throw on access');
    assert.deepEqual(blockedStorageErrors,[],
      'blocked browser storage must not cause uncaught errors during full app startup');
    await blockedStoragePage.close();
    console.log('Full app Chromium smoke test passed: module loading, six-image layout, date mask, and blocked-storage startup.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
