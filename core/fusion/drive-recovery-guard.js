(function(){
  // Verify the upload entry point without pretending a server upload succeeded.
  const stateNode=document.getElementById('driveState');
  const create=document.getElementById('driveCreate');
  function checkUploadEntry(){
    if(typeof window.pti093UploadAll!=='function' && stateNode){
      stateNode.textContent='Lỗi khởi chạy chức năng tải ảnh Drive. Chưa gửi ảnh; hãy tải lại trang thử nghiệm.';
      stateNode.classList.remove('hidden');
    }
  }
  if(create)create.addEventListener('click',()=>setTimeout(checkUploadEntry,0),true);
  // Remove any accidentally rendered CSS text nodes from earlier preview experiments.
  document.querySelectorAll('body *').forEach(function(el){
    if(el.children.length===0 && el.textContent && el.textContent.trim().startsWith('/* Search results: responsive record cards'))el.remove();
  });
})();
