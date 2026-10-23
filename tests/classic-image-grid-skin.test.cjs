const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-image-grid-skin.html');
    await page.evaluate(()=>{
      const original=URL.revokeObjectURL.bind(URL);
      window.__revokedImageUrls=0;
      URL.revokeObjectURL=url=>{window.__revokedImageUrls++;return original(url)};
      window.gridSkin.render();
    });
    await page.waitForFunction(()=>window.__revokedImageUrls===2,{timeout:1500});
    assert.equal(await page.evaluate(()=>window.__revokedImageUrls),2,
      'thumbnail object URLs must be released even when an image cannot be decoded');
    const initial=await page.evaluate(()=>({
      thumbs:document.querySelectorAll('#grid .thumb').length,
      numbers:[...document.querySelectorAll('#grid .thumb .n')].map(x=>x.textContent),
      captions:[...document.querySelectorAll('#grid textarea')].map(x=>x.value),
      transforms:[...document.querySelectorAll('#grid img')].map(x=>x.style.transform),
      disabled:['clear','saveNext','finish'].map(id=>document.getElementById(id).disabled)
    }));
    assert.equal(initial.thumbs,2);
    assert.deepEqual(initial.numbers,['1','2']);
    assert.deepEqual(initial.captions,['Caption A','Caption B']);
    assert.deepEqual(initial.transforms,['rotate(90deg)','rotate(0deg)']);
    assert.deepEqual(initial.disabled,[false,false,false]);
    await page.locator('#grid .thumb').nth(0).locator('button.replace').click();
    await page.locator('#grid .thumb').nth(1).locator('button.insert').click();
    await page.locator('#grid .thumb').nth(0).locator('button.view').click();
    assert.deepEqual(await page.evaluate(()=>window.gridCalls.slice(0,3)),[['replace',0],['insert',1],['view',0]]);
    const firstCaption=page.locator('#grid .thumb').nth(0).locator('textarea');
    await firstCaption.fill('Caption A updated');
    await firstCaption.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelectorAll('#grid textarea')[1]),true,'Tab should move to the next caption field');
    assert.equal(await page.evaluate(()=>window.gridState.current.items[0].caption),'Caption A updated');
    assert.equal(await page.evaluate(()=>window.gridSaves[0]),false,'caption edits should schedule a metadata-only draft save');
    await page.locator('#grid .thumb').nth(1).locator('button.rotate').click();
    assert.equal(await page.evaluate(()=>window.gridState.current.items[1].rotate),90);
    assert.ok(await page.evaluate(()=>window.gridSaves.includes(true)),'rotation should schedule an image-dirty save');
    await page.locator('#grid .thumb').nth(1).locator('button.del2').click();
    assert.equal(await page.locator('#grid .thumb').count(),1);
    await page.locator('#grid .thumb').nth(0).locator('button.del2').click();
    const empty=await page.evaluate(()=>({thumbs:document.querySelectorAll('#grid .thumb').length,disabled:['clear','saveNext','finish'].map(id=>document.getElementById(id).disabled)}));
    assert.deepEqual(empty,{thumbs:0,disabled:[true,true,true]});
    console.log('Classic Image Grid Skin tests passed: thumbnail render, captions, Tab navigation, delegated actions, rotation, deletion, and button states.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
