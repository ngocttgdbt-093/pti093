const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const refs=[...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(m=>m[1]);
const missing=[...new Set(refs.filter(ref=>!fs.existsSync(path.resolve(process.cwd(),ref))))];
assert.deepEqual(missing,[],'Every local src/href reference in index.html must resolve to a repository file');
assert.equal(new Set(refs).size,refs.length,'index.html should not duplicate local src/href references');
const inlineScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([,attrs,source])=>!/\bsrc\s*=/i.test(attrs)&&source.trim());
assert.equal(inlineScripts.length,0,'Application JavaScript should remain in external modules');
console.log('Local asset reference audit passed ('+refs.length+' references; no missing/duplicate references; zero inline scripts).');
