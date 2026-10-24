const assert = require('node:assert/strict');
global.window = global;
require('../core/file-delivery.js');
assert.ok(global.PTI093FileDelivery, 'File Delivery Core module should load');

function setup({userAgent='Windows NT',maxTouchPoints=0,shareSupported=false,popupSupported=true,shareError=null}={}){
  const events={clicked:false,removed:false,appended:false,shared:null,opened:null,revoked:[],created:[],href:''};
  const fakeURL={
    createObjectURL(blob){events.created.push(blob);return 'blob:test-'+events.created.length;},
    revokeObjectURL(url){events.revoked.push(url);}
  };
  const anchor={click(){events.clicked=true;},remove(){events.removed=true;}};
  const fakeDocument={createElement(tag){assert.equal(tag,'a');return anchor;},body:{appendChild(el){assert.equal(el,anchor);events.appended=true;}}};
  class FakeFile{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type;}}
  const fakeNavigator={
    userAgent,maxTouchPoints,
    canShare:shareSupported?()=>true:undefined,
    share:shareSupported?async payload=>{if(shareError)throw shareError;events.shared=payload;}:undefined
  };
  const fakeWindow={open(url,target){events.opened={url,target};return popupSupported?{}:null;}};
  const location={set href(value){events.href=value;},get href(){return events.href;}};
  const api=global.PTI093FileDelivery.install({
    navigator:fakeNavigator,window:fakeWindow,document:fakeDocument,URL:fakeURL,
    File:FakeFile,location,setTimeout:(fn)=>{fn();return 1;}
  });
  return {api,events};
}
(async()=>{
  {
    const {api,events}=setup();
    const blob=new Blob(['pdf bytes'],{type:'application/pdf'});
    await api.exportPdfFile(blob,'case.pdf');
    assert.equal(events.created.length,1);
    assert.equal(events.appended,true);
    assert.equal(events.clicked,true);
    assert.equal(events.removed,true);
    assert.equal(events.revoked[0],'blob:test-1');
  }
  {
    const {api,events}=setup({userAgent:'iPhone',shareSupported:true});
    await api.exportPdfFile(new Blob(['pdf']),'iphone.pdf');
    assert.equal(events.shared.title,'iphone.pdf');
    assert.equal(events.shared.files[0].name,'iphone.pdf');
    assert.equal(events.shared.files[0].type,'application/pdf');
    assert.equal(events.created.length,0);
  }
  {
    const {api,events}=setup({userAgent:'iPhone',shareSupported:false,popupSupported:false});
    await api.exportPdfFile(new Blob(['pdf']),'fallback.pdf');
    assert.equal(events.opened.target,'_blank');
    assert.equal(events.href,'blob:test-1');
    assert.deepEqual(events.revoked,['blob:test-1']);
  }
  {
    const {api,events}=setup({userAgent:'iPhone',shareSupported:true,shareError:Object.assign(new Error('user cancelled'),{name:'AbortError'})});
    await assert.rejects(()=>api.exportPdfFile(new Blob(['pdf']),'cancelled.pdf'),error=>error.name==='AbortError',
      'cancelled iOS share must propagate cancellation so the draft is not cleared');
    assert.equal(events.created.length,0);
  }
  console.log('File Delivery Core tests passed (desktop download, iOS share, cancellation propagation, and iOS popup fallback).');
})().catch(error=>{console.error(error);process.exitCode=1;});
