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

    await page.evaluate(()=>window.testHarness.seedOrphanImages());
    assert.deepEqual(await page.evaluate(()=>window.testHarness.countDraftRows()),{drafts:0,images:1});
    await page.evaluate(()=>window.testHarness.api.restoreAutoDraft());
    assert.deepEqual(await page.evaluate(()=>window.testHarness.countDraftRows()),{drafts:0,images:0},
      'orphaned image rows should be cleaned when AUTO-DRAFT metadata is missing');

    const failureRecovery=await page.evaluate(()=>window.testHarness.cleanupFailureRecovery());
    assert.deepEqual(failureRecovery,{rejected:true,autosaveRecovered:true});
    const recoveredCleanup=await page.evaluate(()=>window.testHarness.cleanup());
    assert.deepEqual(recoveredCleanup,{drafts:0,images:0});

    await page.evaluate(()=>window.testHarness.seed());
    const newTab=await browser.newPage();
    await newTab.goto('http://127.0.0.1:4173/tests/draft-recovery-browser.html');
    const newSession=await newTab.evaluate(()=>sessionStorage.getItem('pti093_work_session_id'));
    assert.notEqual(newSession,session,'a separate tab must have a distinct work session');
    const fresh=await newTab.evaluate(()=>window.testHarness.restoreNewSession());
    assert.equal(fresh.sessionId,newSession);
    assert.equal(fresh.bks,'');
    assert.equal(fresh.hoso,'');
    assert.equal(fresh.garage,'');
    assert.equal(fresh.groups,0);
    assert.equal(fresh.currentItems,0);
    assert.equal(fresh.driveRecordId,'');
    const freshCounts=await newTab.evaluate(()=>window.testHarness.cleanup());
    assert.deepEqual(freshCounts,{drafts:0,images:0},'a new session should discard the previous tab auto-draft');

    console.log('Chromium IndexedDB draft recovery and new-session cleanup passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
