(function(){
  const style=document.getElementById('uiRefreshV42');
  const button=document.getElementById('uiModeToggle');
  if(!style||!button)return;
  const corePreview=typeof window!=='undefined'&&window.PROJECT5_CORE_PREVIEW===true;
  let modern=corePreview;
  try{
    if(!corePreview){
      // Normal 093 app: keep the established Classic default and respect the user's saved toggle choice.
      if(localStorage.getItem('pti093_ui_default_classic_v2')!=='1'){
        localStorage.setItem('pti093_ui_mode','classic');
        localStorage.setItem('pti093_ui_default_classic_v2','1');
      }
      modern=localStorage.getItem('pti093_ui_mode')==='modern';
    }
  }catch(e){ /* Core Preview must still use the new skin when storage is blocked. */ }
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
