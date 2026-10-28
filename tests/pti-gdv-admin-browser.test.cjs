const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    const actions=[];
    let canonicalNames=['Đặng Nam Hải','Phạm Bá Lưu'];
    await page.route('https://script.google.com/macros/s/mock/exec',async route=>{
      const params=new URLSearchParams(route.request().postData()||'');
      const requestId=params.get('requestId')||'';
      let payload={};
      try{payload=JSON.parse(params.get('payload')||'{}')}catch(e){}
      actions.push({url:route.request().url(),action:payload.action});
      let result={ok:true};
      if(payload.action==='publicList')result={ok:true,names:canonicalNames};
      else if(payload.action==='login')result={ok:true,token:'mock-admin-token'};
      else if(payload.action==='list')result={ok:true,names:canonicalNames};
      else if(payload.action==='save'){
        canonicalNames=(payload.names||[]).map(n=>String(n).trim().replace(/\s+/g,' ')).filter(Boolean).sort((a,b)=>a.localeCompare(b,'vi'));
        result={ok:true,names:canonicalNames};
      }else if(payload.action==='logout')result={ok:true};
      else result={ok:false,error:'UNKNOWN_ACTION'};
      const message={type:'PTI_GDV_API_RESULT',requestId,result};
      const body='<!doctype html><html><body><script>window.parent.postMessage('+JSON.stringify(message)+', "*");<\/script></body></html>';
      await route.fulfill({status:200,contentType:'text/html; charset=utf-8',body});
    });
    await page.setContent('<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><select id="gdv"><option value="">Không chọn GĐV</option></select></body></html>');
    await page.evaluate(()=>{window.PTI_GDV_ADMIN_API_URL='https://script.google.com/macros/s/mock/exec'});
    await page.addScriptTag({path:path.join(root,'modules/pti-gdv-admin/admin-gdv.js')});
    await page.waitForFunction(()=>Array.from(document.querySelector('#gdv').options).some(o=>o.value==='Phạm Bá Lưu'));
    assert.equal(await page.locator('#ptiGdvAdminLock').count(),1,'PTI GĐV admin lock button should mount');
    await page.locator('#ptiGdvAdminLock').click();
    await page.locator('#ptiGdvUser').fill('Administrator');
    await page.locator('#ptiGdvPass').fill('mock-password');
    await page.locator('#ptiGdvLogin').click();
    await page.waitForSelector('#ptiGdvSave');
    assert.equal(await page.locator('#ptiGdvRows .gdv-row').count(),2,'admin list should load two canonical names');
    await page.locator('#ptiGdvAdd').click();
    await page.locator('#ptiGdvRows .gdv-row input').last().fill('Vũ Văn Chính');
    await page.locator('#ptiGdvRows [data-remove="0"]').click();
    assert.equal(await page.locator('#ptiGdvRows .gdv-row').count(),2,'remove should affect the edit draft');
    await page.locator('#ptiGdvSave').click();
    await page.waitForFunction(()=>document.querySelector('#ptiGdvAdminMsg')?.textContent.includes('Đã lưu danh sách GĐV thành công'));
    const values=await page.locator('#gdv option').evaluateAll(options=>options.map(o=>o.value));
    assert.ok(values.includes('Phạm Bá Lưu'));
    assert.ok(values.includes('Vũ Văn Chính'));
    assert.ok(!values.includes('Đặng Nam Hải'),'removed name should not remain in the canonical list');
    await page.locator('#ptiGdvLogout').click();
    await page.waitForSelector('#ptiGdvLogin');
    assert.ok(actions.some(x=>x.action==='publicList'));
    for(const action of ['login','list','save','logout'])assert.ok(actions.some(x=>x.action===action),'missing API action '+action);
    assert.ok(actions.every(x=>x.url==='https://script.google.com/macros/s/mock/exec'),'admin requests must stay on the dedicated PTI API endpoint');
    console.log('PASS: PTI GĐV Admin browser flow — public list, login, add/remove/save, canonical refresh and logout.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
