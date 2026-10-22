const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/image-reorder-browser.html');
    const result=await page.evaluate(()=>{
      const h=window.makeReorderHarness();
      const first=h.grid.children[0],second=h.grid.children[1];
      first.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true}));
      second.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,clientY:1000}));
      second.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true}));
      return {
        stateOrder:h.state.current.items.map(x=>x.label),
        domOrder:[...h.grid.children].map(x=>x.textContent),
        saved:h.saved,layoutCount:h.layoutCount,renderCount:h.renderCount,
        dragging:h.grid.querySelectorAll('.dragging,.dragOver').length
      };
    });
    assert.deepEqual(result.stateOrder,['B','A','C'],'dragging A below B should update the application item order');
    assert.deepEqual(result.domOrder,['B','A','C']);
    assert.deepEqual(result.saved,[true],'reordering should schedule an image-dirty draft save');
    assert.equal(result.layoutCount,1,'reordering should refresh the preview layout');
    assert.equal(result.renderCount,1,'drag completion should rerender thumbnails');
    assert.equal(result.dragging,0,'drag classes should be cleared');
    console.log('Chromium image reorder test passed: DOM order, application state, draft scheduling, and cleanup.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
