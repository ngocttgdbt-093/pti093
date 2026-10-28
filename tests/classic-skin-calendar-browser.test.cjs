const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch(e){res.writeHead(400).end();return}
  const target=path.resolve(root,'.'+pathname);
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404).end('Not found');return}
    const ext=path.extname(target);
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'}[ext]||'application/octet-stream';
    res.writeHead(200,{'content-type':type,'cache-control':'no-store'}).end(data);
  });
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:'+address.port+'/tests/classic-skin-calendar-browser.html');
    await page.waitForFunction(()=>window.__skinReady||window.__skinError,{timeout:20000});
    const bootError=await page.evaluate(()=>window.__skinError||'');
    assert.equal(bootError,'','Classic skin should mount and load calendar assets: '+bootError);
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
    assert.ok(style.border.includes('168, 205, 184')||style.border.includes('rgb(168, 205, 184)'),'calendar should use thin green border');
    await page.setViewportSize({width:375,height:812});
    await page.locator('#datePickerBtn').click();
    const bounds=await page.locator('#dateCalendar').boundingBox();
    assert.ok(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=376,'mobile calendar should stay within viewport');
    assert.deepEqual(pageErrors,[],'browser should not report page errors');
    console.log('PASS: Classic skin mounts calendar; dd/mm/yyyy, month navigation, select, clear, today, styling and mobile bounds verified.');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
