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
    console.log('093 GĐV Fusion tests passed: default selection, custom prompt, cached custom name, cancellation, and 093-only list.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
