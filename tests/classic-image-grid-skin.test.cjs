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
    // Group caption success via Enter clears the complete selection only after apply succeeds.
    await page.locator('#grid .thumb').nth(0).locator('.imgBox').click();
    await page.locator('#grid .thumb').nth(1).locator('.imgBox').click({modifiers:['Control']});
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),2);
    await page.locator('#p5BulkCaption').click();
    await page.locator('#p5CaptionInput').press('Enter');
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),2,'empty caption must preserve selection');
    assert.equal(await page.locator('#p5CaptionDialog').isVisible(),true,'validation failure must keep the dialog open');
    await page.locator('#p5CaptionCancel').click();
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),2,'cancel must preserve selection');
    await page.locator('#p5BulkCaption').click();
    await page.locator('#p5CaptionInput').fill('damage. left door');
    await page.locator('#p5CaptionInput').press('Enter');
    assert.deepEqual(await page.evaluate(()=>window.gridState.current.items.map(x=>x.caption)),['Damage. Left door','Damage. Left door']);
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),0,'successful group apply must clear all selected images');
    assert.equal(await page.locator('#p5CaptionDialog').isVisible(),false,'successful Enter apply must close the dialog');
    assert.equal(await page.evaluate(()=>window.gridSaves.at(-1)),true,'successful group apply must request an immediate draft save');
    // Select a different image group immediately, then verify the Apply button uses the same success path.
    await page.locator('#grid .thumb').nth(1).locator('.imgBox').click();
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),1,'a new group can be selected without clicking blank space');
    await page.locator('#p5BulkCaption').click();
    await page.locator('#p5CaptionInput').fill('second group');
    await page.locator('#p5CaptionApply').click();
    assert.deepEqual(await page.evaluate(()=>window.gridState.current.items.map(x=>x.caption)),['Damage. Left door','Second group']);
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),0,'Apply button must clear the new group too');
    // A stale selected item is an apply failure: preserve the selection and keep the dialog open.
    await page.locator('#grid .thumb').nth(0).locator('.imgBox').click();
    await page.locator('#p5BulkCaption').click();
    await page.locator('#p5CaptionInput').fill('must not commit');
    await page.evaluate(()=>window.gridState.current.items.shift());
    await page.locator('#p5CaptionInput').press('Enter');
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),1,'invalid/stale selection must remain selected');
    assert.equal(await page.locator('#p5CaptionDialog').isVisible(),true,'failed apply must leave dialog open');
    await page.evaluate(()=>window.gridState.current.items.unshift({file:new File([new Uint8Array([1,2,3])],'a.jpg',{type:'image/jpeg'}),caption:'Damage. Left door',rotate:90,id:document.querySelector('#grid .thumb').dataset.dragId}));
    await page.evaluate(()=>window.gridSkin.render());
    assert.equal(await page.locator('#grid .thumb.p5-selected').count(),1,'restoring the item must not implicitly clear selection');
    await page.locator('#p5CaptionCancel').click();
    await page.locator('#p5ClearSelection').click();

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
