const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-layout-skin.html');
    const portrait=await page.evaluate(()=>{
      window.layoutSkin.renderLayout();
      return {cells:[...document.querySelectorAll('#layoutPreview .layoutcell')].map(x=>x.textContent),columns:document.getElementById('layoutPreview').style.gridTemplateColumns,text:document.getElementById('layoutText').textContent};
    });
    assert.deepEqual(portrait.cells,['1','2','3','4','5','6']);
    assert.match(portrait.columns,/repeat\(2,/);
    assert.equal(portrait.text,'6 ảnh · A4 dọc · 2 × 3');
    const landscape=await page.evaluate(()=>{
      window.layoutState.per=4;window.layoutState.orientation='landscape';window.layoutSkin.renderLayout();
      return {cells:[...document.querySelectorAll('#layoutPreview .layoutcell')].map(x=>x.textContent),text:document.getElementById('layoutText').textContent};
    });
    assert.deepEqual(landscape.cells,['1','2','3','4']);
    assert.equal(landscape.text,'4 ảnh · A4 ngang · 2 × 2');
    const controls=await page.evaluate(()=>{
      document.querySelector('#counts .opt:nth-child(3)').click();
      document.querySelector('#orient [data-o="landscape"]').click();
      return {per:window.layoutState.per,orientation:window.layoutState.orientation,saveCalls:window.saveCalls,countButtons:document.querySelectorAll('#counts .opt').length,activeCount:document.querySelector('#counts .on')?.textContent,activeOrientation:document.querySelector('#orient .on')?.dataset.o};
    });
    assert.equal(controls.per,3);
    assert.equal(controls.orientation,'landscape');
    assert.equal(controls.saveCalls,2);
    assert.equal(controls.countButtons,6);
    assert.equal(controls.activeCount,'3');
    assert.equal(controls.activeOrientation,'landscape');
    console.log('Classic Layout Skin tests passed: portrait/landscape labels, grid dimensions, and slot counts.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
