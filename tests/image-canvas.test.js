const assert = require('node:assert/strict');
global.window = global;
global.queueMicrotask = queueMicrotask || (fn => Promise.resolve().then(fn));
global.URL = { createObjectURL: () => 'blob:test-image' };
global.Image = class FakeImage {
  constructor() { this.width = 100; this.height = 80; }
  set src(value) { this._src = value; queueMicrotask(() => this.onload && this.onload()); }
  get src() { return this._src; }
};
require('../core/image-canvas.js');

const calls = { drawImage: [], fillText: [], rotate: [], canvasSize: null };
const ctx = {
  fillRect(){}, strokeRect(){}, beginPath(){}, arc(){}, fill(){}, save(){}, restore(){},
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
  assert.equal((await api.loadLogo()).height, 80);
  await api.drawPage({ title: 'Ảnh thiệt hại' }, [{ file: { name: 'x.jpg' }, caption: 'Mặt trước', rotate: 90 }], 1, 1, 1, 0, '');
  assert.deepEqual(calls.canvasSize, [1240, 1754]);
  assert.equal(calls.drawImage.length, 2);
  assert.ok(calls.fillText.includes('Mặt trước'));
  assert.ok(calls.fillText.includes('GĐV: Nguyễn Minh Ngọc'));
  assert.ok(calls.rotate.some(value => Math.abs(value - Math.PI / 2) < 0.0001));
  console.log('Image Canvas Core tests passed (10 checks).');
})().catch(error => { console.error(error); process.exitCode = 1; });
