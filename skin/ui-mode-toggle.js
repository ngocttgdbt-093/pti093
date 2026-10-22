(function(){
  const style=document.getElementById('uiRefreshV42');
  const button=document.getElementById('uiModeToggle');
  if(!style||!button)return;
  let modern=false;
  try{
    // Chuyển mặc định sang Classic một lần cho người dùng hiện hữu; sau đó tôn trọng lựa chọn nút đổi giao diện.
    if(localStorage.getItem('pti093_ui_default_classic_v2')!=='1'){
      localStorage.setItem('pti093_ui_mode','classic');
      localStorage.setItem('pti093_ui_default_classic_v2','1');
    }
    modern=localStorage.getItem('pti093_ui_mode')==='modern';
  }catch(e){}
  function apply(){
    style.disabled=!modern;
    document.body.classList.toggle('classic-ui',!modern);
    button.textContent=modern?'Giao diện Classic':'Giao diện mới';
    button.setAttribute('aria-pressed',String(!modern));
    button.title=modern?'Chuyển về giao diện Classic hiện tại':'Chuyển sang giao diện mới';
  }
  button.addEventListener('click',function(){
    modern=!modern;
    try{localStorage.setItem('pti093_ui_mode',modern?'modern':'classic');}catch(e){}
    apply();
  });
  apply();
})();
