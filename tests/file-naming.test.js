const assert=require('node:assert/strict');
global.window=global;
require('../core/file-naming.js');
let groups=[{title:'Bản ảnh hiện trường'}],plate='30A 12345',gdv='Nguyễn Minh Ngọc';
const api=global.PTI093FileNaming.install({
  getAllGroups:()=>groups,
  $:id=>id==='bks'?{value:plate}:({value:''}),
  selectedGdv:()=>gdv
});
assert.equal(api.fileBaseName('anh-hien-truong.jpg'),'anh-hien-truong');
assert.equal(api.fileBaseName('khong-duoi'),'khong-duoi');
assert.equal(api.fileBaseName(''),'');
assert.equal(api.fileKey({name:'same.jpg',size:12,lastModified:34}),'same.jpg|12|34',
  'ordinary file inputs must keep the legacy key format');
assert.equal(api.fileKey({name:'same.jpg',size:12,lastModified:34,webkitRelativePath:'folderA/same.jpg'}),
  'same.jpg|12|34|folderA/same.jpg','folder inputs must include the relative path in the key');
assert.equal(api.gdvShortName('Nguyễn Minh Ngọc'),'NMN');
assert.equal(api.gdvShortName('Đặng Xuân Linh'),'DXL');
assert.equal(api.gdvShortName('Trần Thị B'),'TTB');
assert.equal(api.gdvShortName(''),'');
assert.equal(api.pdfFileName(),'Anh hien truong 30A_12345 NMN.pdf');
groups=[{title:'Giấy tờ có liên quan'}];
assert.equal(api.pdfFileName(),'Anh giay to 30A_12345 NMN.pdf');
groups=[{title:'Bản ảnh hiện trường'},{title:'Giấy tờ có liên quan'}];
assert.equal(api.pdfFileName(),'Anh giam dinh 30A_12345 NMN.pdf');
plate='';gdv='';
assert.equal(api.pdfFileName(),'Anh giam dinh.pdf');
console.log('File Naming tests passed: basename, GĐV code, plate sanitization, and PDF naming rules.');
