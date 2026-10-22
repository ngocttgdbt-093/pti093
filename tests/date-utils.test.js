const assert=require('node:assert/strict');
global.window=global;
require('../core/date-utils.js');
const listeners={};
const date={
  value:'',selectionStart:0,selectionEnd:0,
  addEventListener:(name,fn)=>{listeners[name]=fn;},
  setSelectionRange:(start,end)=>{date.selectionStart=start;date.selectionEnd=end;},
  get valueTrim(){return this.value.trim();}
};
const api=global.PTI093DateUtils.install({$:id=>{assert.equal(id,'date');return date;}});
assert.equal(api.formatDateDMY('2026-01-02'),'02/01/2026');
assert.equal(api.formatDateDMY('02/01/2026'),'02/01/2026');
date.value='01012026';date.selectionStart=8;listeners.input();
assert.equal(date.value,'01/01/2026','typing digits should auto-insert separators');
assert.equal(api.getDateISO(),'2026-01-01');
date.value='29/02/2024';assert.equal(api.getDateISO(),'2024-02-29');
date.value='29/02/2025';assert.equal(api.getDateISO(),'','invalid calendar date should be rejected');
date.value='31/04/2026';assert.equal(api.getDateISO(),'');
date.value='2026-10-23';assert.equal(api.getDateISO(),'2026-10-23');
api.setDateInput('2026-10-23');assert.equal(date.value,'23/10/2026');
date.value='01012026';date.selectionStart=8;listeners.input();listeners.blur();
assert.equal(date.value,'01/01/2026');
console.log('Date Utils tests passed: format, ISO parse, leap day validation, typing mask, blur normalization.');
