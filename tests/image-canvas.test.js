const assert = require('node:assert/strict');
global.window = global;
global.queueMicrotask = queueMicrotask || (fn => Promise.resolve().then(fn));
const revokedUrls=[];
global.URL = { createObjectURL: () => 'blob:test-image', revokeObjectURL: url => revokedUrls.push(url) };
global.Image = class FakeImage {
  constructor() { this.width = 100; this.height = 80; }
  set src(value) { this._src = value; queueMicrotask(() => this.onload && this.onload()); }
  get src() { return this._src; }
};
require('../core/image-canvas.js');

const calls = { drawImage: [], fillText: [], rotate: [], fillRect: [], canvasSize: null };
const ctx = {
  fillRect: (...args) => calls.fillRect.push(args), strokeRect(){}, beginPath(){}, arc(){}, fill(){}, save(){}, restore(){},
  translate(){}, rotate: value => calls.rotate.push(value),
  drawImage: (...args) => calls.drawImage.push(args),
  fillText: (text) => calls.fillText.push(text),
  measureText: text => ({ width: String(text).length * 10 })
};
const canvas = { width: 0, height: 0, getContext: () => ctx };
const state = { per: 6, orientation: 'portrait' };
const api = global.PTI093ImageCanvasCore.install({
  state,
  $: id => ({ value: ({ bks: '30A-12345', hoso: 'HS-1', garage: 'Garage A' })[id] || '' }),
  pagePixels: () => ({ W: 1240, H: 1754, dpi: 150 }),
  makeCanvas: (w, h) => { calls.canvasSize = [w, h]; canvas.width = w; canvas.height = h; return canvas; },
  formatDateDMY: () => '22/10/2026',
  getDateISO: () => '2026-10-22',
  getLogoSrc: () => 'data:image/png;base64,logo',
  getSelectedGdvCache: () => 'Nguyễn Minh Ngọc'
});
(async () => {
  assert.deepEqual(api.layoutDims(), { cols: 2, rows: 3 });
  state.orientation = 'landscape';
  assert.deepEqual(api.layoutDims(), { cols: 3, rows: 2 });
  state.orientation = 'portrait';
  assert.deepEqual(api.wrap(ctx, 'alpha beta gamma', 50, 10), ['alpha', 'beta', 'gamma']);
  assert.equal((await api.loadImage({ name: 'x.jpg' })).width, 100);
  assert.deepEqual(revokedUrls,['blob:test-image'],'temporary image URLs should be revoked after decoding');
  assert.equal((await api.loadLogo()).height, 80);
  await api.drawPage({ title: 'Ảnh thiệt hại' }, [{ file: { name: 'x.jpg' }, caption: 'Mặt trước', rotate: 90 }], 1, 1, 1, 0, '');
  assert.deepEqual(calls.canvasSize, [1240, 1754]);
  assert.equal(calls.drawImage.length, 2);
  assert.ok(calls.fillText.includes('Mặt trước'));
  assert.ok(calls.fillText.includes('GĐV: Nguyễn Minh Ngọc'));
  assert.ok(calls.rotate.some(value => Math.abs(value - Math.PI / 2) < 0.0001));
  assert.equal(revokedUrls.length,2,'PDF rendering should revoke each decoded image URL instead of leaking it');

  // Project 5 regression: row/column gap settings must change the actual PDF canvas cell geometry.
  state.rowGap=24;state.columnGap=30;
  calls.fillRect.length=0;
  await api.drawPage({title:'Spacing regression'},[
    {file:{name:'a.jpg'},caption:'A',rotate:0},
    {file:{name:'b.jpg'},caption:'B',rotate:0},
    {file:{name:'c.jpg'},caption:'C',rotate:0}
  ],1,1,1,0,'');
  const cellA=calls.fillRect[2],cellB=calls.fillRect[3],cellC=calls.fillRect[4];
  const expectedCellW=(1240-90-30)/2;
  const expectedCellH=(1754-135-70-30-24*2)/3;
  assert.equal(cellB[0]-cellA[0],expectedCellW+30,'PDF canvas must apply columnGap to cell placement');
  assert.equal(cellC[1]-cellA[1],expectedCellH+24,'PDF canvas must apply rowGap to cell placement');
  assert.equal(revokedUrls.length,5,'each additional decoded PDF image URL must also be revoked');
  console.log('Image Canvas Core tests passed (12 checks including Project 5 spacing geometry).');
})().catch(error => { console.error(error); process.exitCode = 1; });
