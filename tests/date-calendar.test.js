const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','skin-classic.css'),'utf8');
const app=fs.readFileSync(path.join(root,'core','app-core.js'),'utf8');
const controller=fs.readFileSync(path.join(root,'skin','date-calendar.js'),'utf8');
const dateUtilsSource=fs.readFileSync(path.join(root,'core','date-utils.js'),'utf8');

new vm.Script(controller,{filename:'skin/date-calendar.js'});
assert.ok(html.includes('<script src="./core/date-utils.js"></script><script src="./skin/date-calendar.js"></script>'),'date calendar loads after date utils');
assert.ok(html.includes('id="datePickerBtn"')&&html.includes('id="dateCalendar"'),'calendar trigger and popup exist');
for(const id of ['dateCalPrev','dateCalNext','dateCalTitle','dateCalDays','dateCalClear','dateCalToday'])assert.ok(html.includes('id="'+id+'"'),'missing #'+id);
assert.ok(html.includes('placeholder="dd/mm/yyyy"'),'field placeholder keeps dd/mm/yyyy');
assert.ok(css.includes('.dateFieldWrap{')&&css.includes('.dateCalendar{')&&css.includes('border:1px solid #a8cdb8')&&css.includes('border-radius:12px')&&css.includes('box-shadow:0 8px 24px'),'green rounded calendar styling exists');
assert.ok(app.includes('window.PTI093DateCalendarSkin.install({$,document,dateUtils})'),'Core mounts the calendar skin with shared date utils');
assert.ok(controller.includes('dateUtils.getDateISO()')&&controller.includes('dateUtils.setDateInput(iso)'),'controller reuses the shared date utils');
assert.ok(controller.includes('(first.getDay()+6)%7'),'calendar weeks start Monday');
assert.ok(!controller.includes("dateInput.addEventListener('input'"),'calendar does not add a second date formatter');

const sandbox={window:{},Date,globalThis:null};
sandbox.globalThis=sandbox;
vm.runInNewContext(dateUtilsSource,sandbox,{filename:'core/date-utils.js'});
const element={value:'05/01/2026',selectionStart:10,setSelectionRange(){},setCustomValidity(){},addEventListener(){},dispatchEvent(){}};
const utils=sandbox.window.PTI093DateUtils.install({$:()=>element});
assert.equal(utils.getDateISO(),'2026-01-05','05/01/2026 must mean 5 January, not 1 May');
assert.equal(utils.getDateISO(), '2026-01-05');
utils.setDateInput('2026-01-05');
assert.equal(element.value,'05/01/2026','ISO to display format keeps dd/mm/yyyy');
element.value='31/02/2026';
assert.equal(utils.getDateISO(),'','impossible calendar date is rejected');

console.log('PASS: Core date calendar markup, module order, skin styling and shared date contract');
