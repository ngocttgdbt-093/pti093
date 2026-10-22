const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/draft-recovery-browser.html');
    const session=await page.evaluate(()=>window.testHarness.seed());
    await page.reload();
    const result=await page.evaluate(()=>window.testHarness.restore());
    assert.equal(result.sessionId,session);
    assert.equal(result.bks,'30A-12345');
    assert.equal(result.hoso,'HS-TEST-01');
    assert.equal(result.garage,'Garage thử');
    assert.equal(result.date,'2026-10-23');
    assert.equal(result.gdv,'GĐV kiểm thử');
    assert.equal(result.orientation,'landscape');
    assert.equal(result.per,4);
    assert.equal(result.groups[0].items[0].caption,'Ảnh trước xe');
    assert.equal(result.groups[0].items[0].rotate,90);
    assert.equal(result.groups[0].items[0].addSeq,1);
    assert.equal(result.current.items[0].caption,'Ảnh sau xe');
    assert.equal(result.current.items[0].rotate,180);
    assert.deepEqual(result.frontBytes,[255,216,255,217]);
    assert.deepEqual(result.rearBytes,[1,2,3,4,5]);
    const counts=await page.evaluate(()=>window.testHarness.cleanup());
    assert.deepEqual(counts,{drafts:0,images:0});
    console.log('Chromium IndexedDB draft recovery passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
