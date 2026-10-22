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
        docx:!!window.PTI093DocxBuilder,
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
        imageIngest:!!window.PTI093ImageIngest
      }
    }));
    assert.equal(initial.counts,6,'six image-count choices should be rendered');
    assert.equal(initial.layoutCells,6,'default layout should show six image slots');
    assert.match(initial.layoutText,/6 ảnh/);
    assert.equal(initial.datePlaceholder,'dd/mm/yyyy');
    assert.deepEqual(initial.modules,{date:true,naming:true,reorder:true,docx:true,pdf:true,canvas:true,localSaveSkin:true,loadProgressSkin:true,imageViewerSkin:true,statusSkin:true,layoutSkin:true,groupListSkin:true,imageGridSkin:true,pdfWarningSkin:true,gdvFusion:true,imageIngest:true});
    await page.locator('#date').fill('01012026');
    assert.equal(await page.locator('#date').inputValue(),'01/01/2026','real app date mask should insert separators');
    assert.deepEqual(pageErrors,[],'the full app should start without uncaught JavaScript errors');
    console.log('Full app Chromium smoke test passed: module loading, initial six-image layout, and date mask.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
