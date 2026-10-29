const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const template=fs.readFileSync(path.join(root,'skins/classic/template.html'),'utf8');

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    await page.setContent('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="skinRoot">'+template+'</div></body></html>');
    await page.addStyleTag({path:path.join(root,'skins/classic/date-calendar.css')});
    await page.addScriptTag({path:path.join(root,'core/date-utils.js')});
    await page.addScriptTag({path:path.join(root,'skins/classic/date-calendar.js')});
    await page.evaluate(()=>{
      const $=id=>document.getElementById(id);
      const dateUtils=window.PTI093DateUtils.install({$});
      window.__calendarInstance=window.PTI093DateCalendarSkin.install({$,document,dateUtils});
    });
    assert.equal(await page.locator('#datePickerBtn').count(),1,'skin template should contain one calendar trigger');
    await page.locator('#date').fill('05012026');
    assert.equal(await page.locator('#date').inputValue(),'05/01/2026','manual entry should preserve dd/mm/yyyy');
    await page.locator('#datePickerBtn').click();
    await page.waitForFunction(()=>!document.getElementById('dateCalendar').classList.contains('hidden'));
    const jan=await page.locator('#dateCalTitle').textContent();
    await page.locator('#dateCalNext').click();
    assert.notEqual(await page.locator('#dateCalTitle').textContent(),jan,'next month should navigate');
    await page.locator('#dateCalPrev').click();
    assert.equal(await page.locator('#dateCalTitle').textContent(),jan,'previous month should return');
    await page.locator('#dateCalendar [data-date="2026-01-06"]').click();
    assert.equal(await page.locator('#date').inputValue(),'06/01/2026','selected date should use shared date utils');
    assert.equal(await page.locator('#dateCalendar').evaluate(el=>el.classList.contains('hidden')),true,'selection should close calendar');
    await page.locator('#datePickerBtn').click();
    await page.locator('#dateCalClear').click();
    assert.equal(await page.locator('#date').inputValue(),'','Clear should empty date');
    await page.locator('#datePickerBtn').click();
    await page.locator('#dateCalToday').click();
    assert.match(await page.locator('#date').inputValue(),/^\d{2}\/\d{2}\/\d{4}$/,'Today should be formatted dd/mm/yyyy');
    const style=await page.locator('#dateCalendar').evaluate(el=>({radius:getComputedStyle(el).borderRadius,border:getComputedStyle(el).borderTopColor}));
    assert.equal(style.radius,'12px','calendar should have soft rounded corners');
    assert.ok(style.border.includes('168, 205, 184'),'calendar should use thin green border');
    await page.setViewportSize({width:375,height:812});
    await page.locator('#datePickerBtn').click();
    const bounds=await page.locator('#dateCalendar').boundingBox();
    assert.ok(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=376,'mobile calendar should stay within viewport');
    assert.deepEqual(pageErrors,[],'browser should not report page errors');
    console.log('PASS: Classic template calendar — dd/mm/yyyy, month navigation, select, clear, today, styling and mobile bounds.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
