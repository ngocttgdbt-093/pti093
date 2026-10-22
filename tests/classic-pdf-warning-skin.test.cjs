const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-pdf-warning-skin.html');
    const shown=await page.evaluate(()=>{
      window.pdfWarningSkin.showPdfWarning('Tệp hiện tại 10.4 MB','Anh giam dinh.pdf');
      return {
        visible:!document.getElementById('pdfWarn').classList.contains('hidden'),
        text:document.getElementById('pdfWarn').innerText,
        checkbox:!!document.getElementById('pdfHighQualityCheck'),
        progress:!!document.getElementById('pdfHighProgress'),
        button:document.querySelector('.pdfHighBtn')?.textContent
      };
    });
    assert.equal(shown.visible,true);
    assert.match(shown.text,/PDF phải nén ảnh/);
    assert.match(shown.text,/Tệp hiện tại 10\.4 MB/);
    assert.equal(shown.checkbox,true);
    assert.equal(shown.progress,true);
    assert.match(shown.button,/Xuất PDF chất lượng cao/);
    await page.locator('#pdfHighQualityCheck').check();
    await page.locator('.pdfHighBtn').click();
    assert.deepEqual(await page.evaluate(()=>window.exportCalls.map(x=>({name:x.name,buttonClass:x.buttonClass,progressId:x.progressId}))),[
      {name:'Anh giam dinh.pdf',buttonClass:'btn green pdfHighBtn',progressId:'pdfHighProgress'},
      {name:'Anh giam dinh.pdf',buttonClass:'btn green pdfHighBtn',progressId:'pdfHighProgress'}
    ]);
    const hidden=await page.evaluate(()=>{window.pdfWarningSkin.hidePdfWarning();return {hidden:document.getElementById('pdfWarn').classList.contains('hidden'),html:document.getElementById('pdfWarn').innerHTML};});
    assert.deepEqual(hidden,{hidden:true,html:''});
    console.log('Classic PDF Warning Skin tests passed: warning text, progress controls, auto-export checkbox, button callback, and cleanup.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
