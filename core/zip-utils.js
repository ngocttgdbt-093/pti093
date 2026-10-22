(function(global){
  'use strict';
  function xmlEsc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
  function b64Bytes(b64){const raw=atob(b64);const u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);return u}
  function crc32(u){let c=0xffffffff;for(let i=0;i<u.length;i++){c^=u[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
  function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
  function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
  function catBytes(arr){let n=arr.reduce((a,b)=>a+b.length,0),o=new Uint8Array(n),p=0;for(const b of arr){o.set(b,p);p+=b.length}return o}
  function zipStore(files){const enc=new TextEncoder(),local=[],central=[];let off=0;for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data);const lh=catBytes([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);local.push(lh);const ch=catBytes([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),name]);central.push(ch);off+=lh.length}const body=catBytes(local),cd=catBytes(central),eocd=catBytes([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(body.length),u16(0)]);return catBytes([body,cd,eocd])}
  function dataUrlBytes(url){return b64Bytes(url.split(',')[1])}
  function unzipStore(buf){const u=new Uint8Array(buf),dec=new TextDecoder(),out={};let p=0;while(p<=u.length-30){if(u[p]!==0x50||u[p+1]!==0x4b||u[p+2]!==0x03||u[p+3]!==0x04){p++;continue}const method=u[p+8]|(u[p+9]<<8),csize=(u[p+18]|(u[p+19]<<8)|(u[p+20]<<16)|(u[p+21]<<24))>>>0,nlen=u[p+26]|(u[p+27]<<8),elen=u[p+28]|(u[p+29]<<8),nameStart=p+30,nameEnd=nameStart+nlen,dataStart=nameEnd+elen;if(method!==0)throw new Error('Bản nháp này dùng ZIP nén. Hãy mở file được tạo bởi phần mềm.');out[dec.decode(u.slice(nameStart,nameEnd))]=u.slice(dataStart,dataStart+csize);p=dataStart+csize}return out}
  function textFile(files,name){return files[name]?new TextDecoder().decode(files[name]):''}
  global.PTISharedCore=Object.assign(global.PTISharedCore||{},{
    xmlEsc,b64Bytes,crc32,u16,u32,catBytes,zipStore,dataUrlBytes,unzipStore,textFile
  });
})(window);
