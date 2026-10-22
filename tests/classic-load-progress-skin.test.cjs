const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-load-progress-skin.html');
    const progress=await page.evaluate(()=>{
      window.loadProgressSkin.setOpenLoad('PC',2,5,'Đang tải ảnh');
      return {visible:!document.getElementById('openLoadBox').classList.contains('hidden'),width:document.getElementById('openLoadBar').style.width,pct:document.getElementById('openLoadPct').textContent,text:document.getElementById('openLoadText').textContent,meta:document.getElementById('openLoadMeta').textContent};
    });
    assert.deepEqual(progress,{visible:true,width:'40%',pct:'40%',text:'Đang tải ảnh',meta:'Đã tải 2/5 ảnh · PC'});
    const connecting=await page.evaluate(()=>{
      window.loadProgressSkin.setOpenLoad('iPhone/iPad',0,0);
      return {width:document.getElementById('openLoadBar').style.width,pct:document.getElementById('openLoadPct').textContent,text:document.getElementById('openLoadText').textContent,meta:document.getElementById('openLoadMeta').textContent};
    });
    assert.deepEqual(connecting,{width:'0%',pct:'0%',text:'Đang tải dữ liệu từ iPhone/iPad...',meta:'Đang kết nối iPhone/iPad...'});
    const finished=await page.evaluate(()=>{
      window.loadProgressSkin.finishOpenLoad('PC',7);
      return {width:document.getElementById('openLoadBar').style.width,pct:document.getElementById('openLoadPct').textContent,text:document.getElementById('openLoadText').textContent,meta:document.getElementById('openLoadMeta').textContent};
    });
    assert.deepEqual(finished,{width:'100%',pct:'100%',text:'✓ Đã tải hoàn tất từ PC',meta:'Hoàn tất 7 ảnh · Có thể tiếp tục chỉnh sửa.'});
    console.log('Classic Load Progress Skin tests passed: loading, connection, and completion states.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
