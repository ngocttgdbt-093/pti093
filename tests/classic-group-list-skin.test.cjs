const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async function(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto('http://127.0.0.1:4173/tests/classic-group-list-skin.html');
    await page.evaluate(()=>window.groupListSkin.renderGroups());
    const empty=await page.locator('#groupsBox').innerText();
    assert.match(empty,/Chưa có nội dung nào được lưu/);
    const populated=await page.evaluate(()=>{
      window.groupState.groups=[
        {title:'Bản ảnh hiện trường',items:[{},{},{}]},
        {title:'Giấy tờ có liên quan',items:[{}]}
      ];
      window.groupListSkin.renderGroups();
      return {heading:document.querySelector('#groupsBox > .muted')?.textContent,rows:document.querySelectorAll('#groupsBox > div').length,text:document.getElementById('groupsBox').innerText};
    });
    assert.equal(populated.heading,'Các nội dung đã lưu');
    assert.equal(populated.rows,3);
    assert.match(populated.text,/1\. Bản ảnh hiện trường · 3 ảnh/);
    assert.match(populated.text,/2\. Giấy tờ có liên quan · 1 ảnh/);
    await page.locator('#groupsBox button').nth(1).click();
    assert.equal(await page.evaluate(()=>window.editedIndex),1,'edit button should delegate the selected group index');
    console.log('Classic Group List Skin tests passed: empty state, group labels, counts, and edit callback.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
