const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/gdv-093-fusion.html');
    const result=await page.evaluate(()=>{
      const normal=(document.getElementById('gdv').value='Phạm Duy Thái',window.gdvFusion.selectedGdv());
      document.getElementById('gdv').value='Nhập tên khác';window.promptValue='Nguyễn Văn B';
      const custom=window.gdvFusion.selectedGdv();
      const cached=window.gdvFusion.selectedGdv();
      document.getElementById('gdv').dataset.custom='';window.promptValue='';
      const cancelled=window.gdvFusion.selectedGdv();
      return {normal,custom,cached,cancelled,promptCalls:window.promptCalls,stored:localStorage.getItem('pti093_gdv_custom'),names:window.gdvFusion.names};
    });
    assert.equal(result.normal,'Phạm Duy Thái');
    assert.equal(result.custom,'Nguyễn Văn B');
    assert.equal(result.cached,'Nguyễn Văn B');
    assert.equal(result.cancelled,'NONAME');
    assert.equal(result.promptCalls,2,'custom-name prompt should be skipped when a cached value exists');
    assert.equal(result.stored,'Nguyễn Văn B');
    assert.deepEqual(result.names,['Phạm Duy Thái','Đặng Xuân Linh','Nguyễn Tuấn Hưng','Đặng Xuân Diệu','Đặng Văn Hiên','Nguyễn Minh Ngọc']);
    const persistence=await page.evaluate(()=>{
      localStorage.removeItem('pti093_gdv');localStorage.removeItem('pti093_gdv_custom');
      const select=document.getElementById('gdv');select.dataset.custom='';
      window.gdvFusion.bindSelectionPersistence(()=>{window.autoSaveCalls=(window.autoSaveCalls||0)+1;});
      select.value='Phạm Duy Thái';select.dispatchEvent(new Event('change'));
      select.value='Nhập tên khác';window.promptValue='Nguyễn Văn C';
      select.dispatchEvent(new Event('change'));
      return {saved:localStorage.getItem('pti093_gdv'),custom:localStorage.getItem('pti093_gdv_custom'),dataset:select.dataset.custom,autoSaveCalls:window.autoSaveCalls};
    });
    assert.equal(persistence.saved,'Phạm Duy Thái');
    assert.equal(persistence.custom,'Nguyễn Văn C');
    assert.equal(persistence.dataset,'Nguyễn Văn C');
    assert.equal(persistence.autoSaveCalls,2);
    const blocked=await page.evaluate(()=>{
      const originalGet=Storage.prototype.getItem,originalSet=Storage.prototype.setItem;
      try{
        Storage.prototype.getItem=function(){throw new Error('storage blocked')};
        Storage.prototype.setItem=function(){throw new Error('storage blocked')};
        const select=document.getElementById('gdv');select.dataset.custom='';
        let autosaves=0;
        window.gdvFusion.bindSelectionPersistence(()=>{autosaves++});
        select.value='Phạm Duy Thái';select.dispatchEvent(new Event('change'));
        select.value='Nhập tên khác';window.promptValue='Tên tạm thời';select.dispatchEvent(new Event('change'));
        return {selected:window.gdvFusion.selectedGdv(),dataset:select.dataset.custom,autosaves};
      }finally{
        Storage.prototype.getItem=originalGet;Storage.prototype.setItem=originalSet;
      }
    });
    assert.equal(blocked.selected,'Tên tạm thời','GĐV selection should still work when browser storage is blocked');
    assert.equal(blocked.dataset,'Tên tạm thời');
    assert.equal(blocked.autosaves,2,'blocked storage must not prevent autosave scheduling');
    console.log('093 GĐV Fusion tests passed: default selection, custom prompt, cached custom name, cancellation, 093-only list, and blocked-storage recovery.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
