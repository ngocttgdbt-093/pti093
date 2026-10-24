const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-local-save-skin.html');
    const normal=await page.evaluate(()=>{
      window.localSaveSkin.renderLocalSaveFeedback('LOCAL-TEST-1',45,'Đang lưu ảnh','2 ảnh',false);
      return {
        hostDisplay:document.getElementById('ptiPreviewFeedback').style.display,
        id:document.getElementById('ptiLocalSaveId').textContent,
        label:document.getElementById('ptiLocalSaveLabel').textContent,
        pct:document.getElementById('ptiLocalSavePct').textContent,
        barWidth:document.getElementById('ptiLocalSaveBar').style.width,
        detail:document.getElementById('ptiLocalSaveDetail').textContent
      };
    });
    assert.equal(normal.hostDisplay,'grid');
    assert.equal(normal.id,'💻 ID hồ sơ local: LOCAL-TEST-1');
    assert.equal(normal.label,'Đang lưu ảnh');
    assert.equal(normal.pct,'45%');
    assert.equal(normal.barWidth,'45%');
    assert.equal(normal.detail,'2 ảnh');
    const failed=await page.evaluate(()=>{
      window.localSaveSkin.renderLocalSaveFeedback('LOCAL-TEST-1',null,'Lưu thất bại','Quota exceeded',true);
      return {pct:document.getElementById('ptiLocalSavePct').textContent,width:document.getElementById('ptiLocalSaveBar').style.width,detail:document.getElementById('ptiLocalSaveDetail').textContent};
    });
    assert.deepEqual(failed,{pct:'!',width:'100%',detail:'Quota exceeded'});
    const cancelled=page.evaluate(async()=>{const p=window.localSaveSkin.showLocalSaveConfirm(10);document.querySelector('.localSaveCancel').click();return await p;});
    assert.equal(await cancelled,false);
    const confirmed=page.evaluate(async()=>{const p=window.localSaveSkin.showLocalSaveConfirm(3);document.querySelector('.localSaveConfirm').click();return await p;});
    assert.equal(await confirmed,true);
    assert.equal(await page.locator('.localSaveOverlay').count(),0,'confirmation dialog should be removed after selection');
    console.log('Classic Local Save Skin tests passed: progress, failure state, cancel, and confirm.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
