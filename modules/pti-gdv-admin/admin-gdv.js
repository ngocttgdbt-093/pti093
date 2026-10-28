/* PTI GĐV Admin UI — uses a dedicated API, never the 093 records API.
 * Set PTI_GDV_ADMIN_API_URL to the deployed standalone PTI_GDV_ADMIN_API /exec URL.
 */
(function(){
  'use strict';
  const API_URL = window.PTI_GDV_ADMIN_API_URL || 'https://script.google.com/macros/s/AKfycbx-ol-UyqgGxte1f7xbr_pXiQI3As0XFlx0mdeCy1ykUBGKDge40RlGjvpBakhnRH71zQ/exec';
  const select = document.getElementById('gdv');
  if (!select || document.getElementById('ptiGdvAdminLock')) return;
  const css = document.createElement('style');
  css.textContent = `
    #ptiGdvAdminLock{position:fixed;right:14px;bottom:12px;z-index:9998;border:1px solid #d5a500;background:#ffdf55;color:#382d00;border-radius:50%;width:42px;height:42px;font-size:21px;box-shadow:0 2px 10px #0002;cursor:pointer}
    #ptiGdvAdminShade{position:fixed;inset:0;z-index:9999;background:#14251fcc;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}
    #ptiGdvAdminPanel{background:#fff;color:#18312a;width:min(520px,100%);max-height:88vh;overflow:auto;border-radius:14px;padding:22px;box-shadow:0 12px 50px #0005;font:14px/1.45 system-ui,sans-serif}
    #ptiGdvAdminPanel h2{margin:0 0 14px;font-size:20px}
    #ptiGdvAdminPanel label{display:block;margin:10px 0 4px;font-weight:600}
    #ptiGdvAdminPanel input{box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd5d1;border-radius:8px;font:inherit}
    #ptiGdvAdminPanel button{border:0;border-radius:8px;padding:9px 13px;cursor:pointer;font:inherit;margin:5px 5px 0 0}
    #ptiGdvAdminPanel .primary{background:#176b50;color:white}
    #ptiGdvAdminPanel .muted{background:#edf2ef;color:#18312a}
    #ptiGdvAdminPanel .danger{background:#fee2e2;color:#991b1b}
    #ptiGdvAdminPanel .gdv-row{display:flex;gap:6px;align-items:center;margin:7px 0}
    #ptiGdvAdminPanel .gdv-row input{flex:1;min-width:0}
    #ptiGdvAdminMsg{margin-top:10px;white-space:pre-wrap;color:#475569}
  `;
  document.head.appendChild(css);
  const lock = document.createElement('button');
  lock.id='ptiGdvAdminLock'; lock.type='button'; lock.title='Quản trị danh sách GĐV'; lock.setAttribute('aria-label','Quản trị danh sách GĐV'); lock.textContent='🔒';
  document.body.appendChild(lock);
  let token = '', names = [];
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function refreshSelect(list){
    const current=select.value;
    select.replaceChildren(new Option('Không chọn GĐV',''));
    list.forEach(n=>select.add(new Option(n,n)));
    if(current && list.includes(current)) select.value=current;
    else if(current) { select.value=''; select.dispatchEvent(new Event('change',{bubbles:true})); }
  }
  let bridgeFrame=null, bridgeCounter=0;
  const bridgePending=new Map();
  function ensureBridge(){
    if(bridgeFrame && bridgeFrame.isConnected) return bridgeFrame;
    bridgeFrame=document.createElement('iframe');
    bridgeFrame.name='ptiGdvAdminBridgeFrame';
    bridgeFrame.title='Kênh kết nối quản trị PTI';
    bridgeFrame.setAttribute('aria-hidden','true');
    bridgeFrame.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:0';
    document.body.appendChild(bridgeFrame);
    return bridgeFrame;
  }
  window.addEventListener('message',event=>{
    let host='';
    try{host=new URL(event.origin).hostname;}catch(e){host=String(event.origin||'');}
    const d=event.data;
    if(host==='script.google.com'||/googleusercontent\.com$/.test(host)||event.origin==='null'){
      const type=d&&typeof d==='object'?String(d.type||'object'):typeof d;
      const requestId=d&&d.type==='PTI_GDV_API_RESULT'?String(d.requestId||'').slice(0,80):'-';
      const pending=d&&d.requestId?bridgePending.has(String(d.requestId)):false;
      console.info('PTI GĐV bridge inbound origin='+host+' type='+type+' requestId='+requestId+' pending='+pending);
    }
    if(!(/(^|\.)googleusercontent\.com$/.test(host)||host==='script.google.com')){if(d&&d.type==='PTI_GDV_API_RESULT')console.warn('PTI GĐV bridge rejected origin '+host);return;}
    if(!d||d.type!=='PTI_GDV_API_RESULT'||!d.requestId||!bridgePending.has(d.requestId))return;
    const p=bridgePending.get(d.requestId);
    bridgePending.delete(d.requestId);
    clearTimeout(p.timer);
    p.resolve(d.result);
  });
  async function call(action,data={}){
    if(!API_URL) throw new Error('Chưa cấu hình API quản trị GĐV riêng cho PTI.');
    ensureBridge();
    const requestId='pti-gdv-'+Date.now().toString(36)+'-'+(++bridgeCounter).toString(36);
    console.info('PTI GĐV bridge request action='+action+' requestId='+requestId);
    const payload=JSON.stringify({action,...data});
    const resultPromise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{bridgePending.delete(requestId);reject(new Error('Máy chủ chưa phản hồi sau 25 giây. Hãy thử lại; chưa xác nhận được kết quả.'));},25000);
      bridgePending.set(requestId,{resolve,reject,timer});
    });
    const form=document.createElement('form');
    form.method='POST';form.action=API_URL;form.target='ptiGdvAdminBridgeFrame';
    form.acceptCharset='UTF-8';form.style.display='none';
    [['bridge','1'],['requestId',requestId],['payload',payload]].forEach(([name,value])=>{
      const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);
    });
    document.body.appendChild(form);
    try{form.submit();}catch(e){
      const p=bridgePending.get(requestId);
      if(p){clearTimeout(p.timer);bridgePending.delete(requestId);}
      form.remove();throw e;
    }
    setTimeout(()=>form.remove(),1000);
    const result=await resultPromise;
    if(!result||!result.ok) throw new Error(({UNAUTHORIZED:'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.',INVALID_LOGIN:'Sai tài khoản hoặc mật khẩu.',ADMIN_PASSWORD_NOT_CONFIGURED:'Máy chủ chưa cấu hình mật khẩu quản trị.'})[result&&result.error]||(result&&result.error)||'Máy chủ trả về phản hồi không hợp lệ.');
    return result;
  }
  function close(revokeSession=true){
    document.getElementById('ptiGdvAdminShade')?.remove();
    if(revokeSession && token){
      const activeToken=token;
      token='';
      call('logout',{token:activeToken}).catch(()=>{});
    }
  }
  function show(content){
    close(false);
    const shade=document.createElement('div'); shade.id='ptiGdvAdminShade';
    shade.innerHTML='<section id="ptiGdvAdminPanel" role="dialog" aria-modal="true">'+content+'</section>';
    shade.addEventListener('click',e=>{if(e.target===shade)close();});
    document.body.appendChild(shade);
    shade.querySelector('[data-close]')?.addEventListener('click',close);
    return shade;
  }
  function loginView(error=''){
    const shade=show(`<h2>🔐 Quản trị danh sách GĐV</h2>
      <p>Chỉ quản trị viên mới được thêm, sửa hoặc xóa tên. Dữ liệu danh sách được lưu trên máy chủ quản trị riêng của PTI.</p>
      <label for="ptiGdvUser">Tài khoản</label><input id="ptiGdvUser" value="Administrator" autocomplete="username">
      <label for="ptiGdvPass">Mật khẩu</label><input id="ptiGdvPass" type="password" autocomplete="current-password">
      <div><button class="primary" id="ptiGdvLogin">Đăng nhập</button><button class="muted" data-close>Đóng</button></div>
      <div id="ptiGdvAdminMsg">${esc(error||(!API_URL?'Chưa kết nối API quản trị riêng. Cần triển khai backend độc lập trước khi sử dụng.':''))}</div>`);
    shade.querySelector('#ptiGdvLogin').onclick=async()=>{
      const msg=shade.querySelector('#ptiGdvAdminMsg'); msg.textContent='Đang xác thực…';
      try{const r=await call('login',{username:shade.querySelector('#ptiGdvUser').value.trim(),password:shade.querySelector('#ptiGdvPass').value});token=r.token; await loadNames(); adminView();}
      catch(e){msg.textContent=e.message;}
    };
    shade.querySelector('#ptiGdvPass').addEventListener('keydown',e=>{if(e.key==='Enter')shade.querySelector('#ptiGdvLogin').click();});
  }
  async function loadNames(){const r=await call('list',{token});names=r.names||[];refreshSelect(names);}
  function adminView(message=''){
    const rows=names.map((n,i)=>`<div class="gdv-row"><input aria-label="Tên GĐV ${i+1}" data-index="${i}" value="${esc(n)}"><button class="danger" data-remove="${i}" title="Xóa tên này">Xóa</button></div>`).join('');
    const shade=show(`<h2>Quản trị danh sách GĐV</h2><p>Thêm, sửa trực tiếp tên bên dưới. Khi lưu, danh sách được chuẩn hóa và sắp xếp theo alphabet.</p>
      <div id="ptiGdvRows">${rows||'<p>Chưa có tên GĐV.</p>'}</div>
      <button class="muted" id="ptiGdvAdd">+ Thêm GĐV</button><div>
      <button class="primary" id="ptiGdvSave">Lưu danh sách</button><button class="muted" id="ptiGdvLogout">Đăng xuất</button><button class="muted" data-close>Đóng</button></div>
      <div id="ptiGdvAdminMsg">${esc(message)}</div>`);
    shade.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{namesFromInputs(shade);names.splice(Number(b.dataset.remove),1);adminView('Đã xóa khỏi bản nháp; bấm Lưu danh sách để xác nhận.');});
    shade.querySelector('#ptiGdvAdd').onclick=()=>{namesFromInputs(shade);names.push('');adminView();const inputs=shade.querySelectorAll('.gdv-row input');inputs[inputs.length-1]?.focus();};
    shade.querySelector('#ptiGdvSave').onclick=async()=>{
      namesFromInputs(shade);
      const cleaned=names.map(n=>n.trim().replace(/\s+/g,' ')).filter(Boolean);
      if(cleaned.some(n=>n.length>100)){shade.querySelector('#ptiGdvAdminMsg').textContent='Tên GĐV không được vượt quá 100 ký tự.';return;}
      const msg=shade.querySelector('#ptiGdvAdminMsg');msg.textContent='Đang lưu…';
      try{const r=await call('save',{token,names:cleaned});names=r.names||[];refreshSelect(names);adminView('Đã lưu danh sách GĐV thành công.');}
      catch(e){msg.textContent=e.message;}
    };
    shade.querySelector('#ptiGdvLogout').onclick=async()=>{try{await call('logout',{token});}catch(e){} token='';loginView();};
  }
  function namesFromInputs(root){root.querySelectorAll('.gdv-row input').forEach(el=>{names[Number(el.dataset.index)]=el.value;});}
  lock.addEventListener('click',()=>token?adminView():loginView());
  if(API_URL){call('publicList').then(r=>refreshSelect(r.names||[])).catch(e=>console.warn('Không tải được danh sách GĐV PTI:',e.message));}
  // Load the public GĐV list from the dedicated PTI admin API; never call the 093 API.
})();
