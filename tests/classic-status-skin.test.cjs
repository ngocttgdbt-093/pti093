const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-status-skin.html');
    const result=await page.evaluate(()=>{
      window.statusSkin.msg('Đã lưu thành công',true);
      const shown={text:document.getElementById('status').textContent,hidden:document.getElementById('status').classList.contains('hidden')};
      window.statusSkin.msg('Ẩn trạng thái',false);
      const hidden={text:document.getElementById('status').textContent,hidden:document.getElementById('status').classList.contains('hidden')};
      window.statusSkin.setDriveState('Đã lưu Drive',true);
      const normal={text:document.getElementById('driveState').textContent,className:document.getElementById('driveState').className};
      window.statusSkin.setDriveState('Lỗi lưu Drive',false);
      const warning={text:document.getElementById('driveState').textContent,className:document.getElementById('driveState').className};
      return {shown,hidden,normal,warning};
    });
    assert.deepEqual(result,{
      shown:{text:'Đã lưu thành công',hidden:false},
      hidden:{text:'Ẩn trạng thái',hidden:true},
      normal:{text:'Đã lưu Drive',className:'driveState'},
      warning:{text:'Lỗi lưu Drive',className:'driveState driveWarn'}
    });
    console.log('Classic Status Skin tests passed: visible/hidden messages and normal/warning Drive status.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
