const assert=require('node:assert/strict');
global.window=global;
require('../core/device-context.js');
assert.ok(global.PTI093DeviceContext);
const cases=[
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','iPhone/iPad'],
  ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)','iPhone/iPad'],
  ['Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0)','iPhone/iPad'],
  ['Mozilla/5.0 (Linux; Android 15; Pixel 9)','điện thoại Android'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)','PC'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)','PC'],
  ['', 'PC']
];
for(const [userAgent,expected] of cases){
  const api=global.PTI093DeviceContext.install({navigator:{userAgent}});
  assert.equal(api.deviceStorageLabel(),expected,userAgent||'empty user agent');
}
console.log('Device Context Core tests passed (iPhone/iPad/iPod, Android, desktop, and empty UA).');
