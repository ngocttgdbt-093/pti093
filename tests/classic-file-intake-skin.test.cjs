const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-file-intake-skin.html');
    const drag=await page.evaluate(()=>{
      const zone=document.getElementById('drop');
      const enter=new DragEvent('dragenter',{bubbles:true,cancelable:true});
      zone.dispatchEvent(enter);
      const afterEnter=zone.classList.contains('drag');
      zone.dispatchEvent(new DragEvent('dragleave',{bubbles:true,cancelable:true}));
      const afterLeave=zone.classList.contains('drag');
      const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1])],'dropped.jpg',{type:'image/jpeg'}));
      zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
      return {afterEnter,afterLeave,afterDrop:zone.classList.contains('drag'),calls:window.intakeCalls.slice()};
    });
    assert.deepEqual(drag,{afterEnter:true,afterLeave:false,afterDrop:false,calls:[['dropped.jpg']]});
    await page.locator('#files').setInputFiles([{name:'picked.jpg',mimeType:'image/jpeg',buffer:Buffer.from([1,2])}]);
    assert.equal(await page.locator('#files').inputValue(),'','file input should reset after selection');
    await page.locator('#folder').setInputFiles([{name:'folder-photo.png',mimeType:'image/png',buffer:Buffer.from([3,4])}]);
    assert.equal(await page.locator('#folder').inputValue(),'','folder input should reset after selection');
    assert.deepEqual(await page.evaluate(()=>window.intakeCalls),[['dropped.jpg'],['picked.jpg'],['folder-photo.png']]);
    console.log('Classic File Intake Skin tests passed: drag styling, drop files, picker/folder delegation, and input reset.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
