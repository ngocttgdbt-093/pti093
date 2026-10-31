const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors=[],requested=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('request',r=>requested.push(new URL(r.url()).pathname));
    await page.goto('http://127.0.0.1:4173/index.html?corePreview=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#counts .opt');
    await page.waitForSelector('#layoutPreview .layoutcell');
    const boot=await page.evaluate(()=>({
      previewMode:window.PROJECT5_CORE_PREVIEW===true,
      title:document.title,
      modernToggle:!!document.getElementById('uiModeToggle'),
      modernStylesheet:!!document.querySelector('link[href*="skin-modern.css"]'),
      modernScripts:!!document.querySelector('script[src*="modern-image-gallery.js"],script[src*="ui-mode-toggle.js"]'),
      classicGrid:!!window.PTI093ClassicImageGridSkin,
      captionCore:!!window.PTI093CaptionTools,
      dateApi:!!window.PTI093DateAPI,
      dateCalendar:!!window.PTI093DateCalendarSkin,
      dateTrigger:!!document.getElementById('datePickerBtn'),
      driveUi:!!document.querySelector('.driveBox,#driveCreate,#driveSaveProject,#driveSaveDraft'),
      driveFusion:!!window.PTI093DriveFusion,
      driveUpload:typeof window.pti093UploadAll,
      gdvAdmin:!!window.PTI093GdvAdmin||!!window.PTIGdvAdmin,
      slots:document.querySelectorAll('#layoutPreview .layoutcell').length,
      datePlaceholder:document.getElementById('date').placeholder
    }));
    assert.equal(boot.previewMode,true);
    assert.match(boot.title,/Classic Skin/);
    assert.equal(boot.modernToggle,false,'Modern toggle must not be present');
    assert.equal(boot.modernStylesheet,false,'Modern stylesheet must not load');
    assert.equal(boot.modernScripts,false,'Modern gallery and mode-toggle scripts must not load');
    assert.equal(boot.classicGrid,true,'Classic image grid must initialize');
    assert.equal(boot.captionCore,true,'shared caption Core must initialize');
    assert.equal(boot.dateApi,true,'shared date utilities must initialize');
    assert.equal(boot.dateCalendar,true,'Classic calendar module must initialize');
    assert.equal(boot.dateTrigger,true,'date picker trigger must be mounted');
    assert.equal(boot.driveUi,false,'Drive controls must not exist in the Core acceptance page');
    assert.equal(boot.driveFusion,false,'Drive Fusion must not initialize');
    assert.equal(boot.driveUpload,'undefined','Drive upload entry must not be installed');
    assert.equal(boot.gdvAdmin,false,'PTI GĐV administration must not load into Core');
    assert.equal(boot.slots,6,'default Classic layout must show six image slots');
    assert.equal(boot.datePlaceholder,'dd/mm/yyyy','date entry must use dd/mm/yyyy');
    assert.equal(requested.some(p=>p.endsWith('/fusion/drive.js')||p.endsWith('/fusion/drive-recovery-guard.js')),false,'no Drive fusion request may occur');

    await page.locator('#datePickerBtn').click();
    await page.locator('#dateCalToday').click();
    assert.match(await page.locator('#date').inputValue(),/^\\d{2}\\/\\d{2}\\/\\d{4}$/,'Classic calendar should write dd/mm/yyyy');

    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC','base64');
    await page.locator('#files').setInputFiles({name:'core-preview-smoke.png',mimeType:'image/png',buffer:png});
    await page.waitForSelector('#grid .thumb');
    await page.locator('#finish').click();
    await page.waitForSelector('#preview .pageprev canvas',{timeout:15000});
    const preview=await page.evaluate(()=>({pages:document.querySelectorAll('#preview .pageprev canvas').length,pdfDisabled:document.getElementById('pdf').disabled}));
    assert.equal(preview.pages,1,'one image should produce one preview page');
    assert.equal(preview.pdfDisabled,false,'PDF export should be enabled after preview');
    const downloadPromise=page.waitForEvent('download',{timeout:20000});
    await page.locator('#pdf').click();
    const download=await downloadPromise;
    assert.ok(download.suggestedFilename().toLowerCase().endsWith('.pdf'),'Classic Core should export a PDF');
    assert.deepEqual(pageErrors,[],'Classic Core should start and process an image without uncaught browser errors');
    console.log('PASS: Core Preview uses Classic only, excludes Drive/Modern/GĐV admin, calendar works, image ingest and PDF export work.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
