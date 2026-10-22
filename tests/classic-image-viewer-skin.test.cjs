const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-image-viewer-skin.html');
    await page.evaluate(()=>window.openTestImage(2,90));
    const view=await page.evaluate(()=>({
      count:document.querySelectorAll('.pti093Viewer').length,
      title:document.querySelector('.pti093ViewerTitle')?.textContent,
      alt:document.querySelector('.pti093Viewer img')?.alt,
      transform:document.querySelector('.pti093Viewer img')?.style.transform,
      blobUrl:document.querySelector('.pti093Viewer img')?.src.startsWith('blob:')
    }));
    assert.deepEqual(view,{count:1,title:'Ảnh số 3',alt:'Ảnh số 3',transform:'rotate(90deg)',blobUrl:true});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pti093Viewer').count(),0,'Escape should close the image viewer');
    await page.evaluate(()=>window.openTestImage(0,270));
    await page.locator('.pti093ViewerClose').click();
    assert.equal(await page.locator('.pti093Viewer').count(),0,'close button should close the image viewer');
    await page.evaluate(()=>window.openTestImage(0,0));
    await page.locator('.pti093Viewer').click({position:{x:2,y:2}});
    assert.equal(await page.locator('.pti093Viewer').count(),0,'backdrop click should close the image viewer');
    console.log('Classic Image Viewer Skin tests passed: image metadata, rotation, Escape, close button, and backdrop.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
