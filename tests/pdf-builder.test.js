const assert = require('node:assert/strict');
global.window = global;
require('../core/pdf-builder.js');
assert.ok(global.PTI093PdfBuilder, 'PDF Builder Core module should load');
const state = { orientation: 'portrait', per: 6 };
const api = global.PTI093PdfBuilder.install({ state, PDF_SAFE_LIMIT: 9.5 * 1048576 });
assert.equal(api.pagePixels().dpi, 150);
assert.equal(api.pagePixels().W, 1240);
assert.equal(api.pagePixels().H, 1754);
assert.equal(api.jpegQuality(), 0.80);
assert.equal(api.pdfPackSize(new Uint8Array([1,2,3])), 3);
const fakeJpeg = Buffer.from('fake-jpeg-bytes').toString('base64');
const canvas = {
  width: 100,
  height: 200,
  toDataURL: () => 'data:image/jpeg;base64,' + fakeJpeg
};
const bytes = api.pdfBytesFromCanvases([canvas], 0.8);
const text = new TextDecoder().decode(bytes);
assert.ok(text.startsWith('%PDF-1.4'));
assert.ok(text.endsWith('%%EOF'));
assert.equal(api.resamplePdfCanvases([canvas], 150)[0], canvas);
(async () => {
  const built = await api.buildAdaptivePdf([canvas]);
  assert.ok(built.bytes instanceof Uint8Array);
  assert.equal(built.dpi, 150);
  assert.equal(built.compressed, false);
  const parts = await api.splitPdfBytes([canvas], 'sample.pdf');
  assert.equal(parts.length, 1);
  assert.equal(parts[0].filename, 'sample Phan 1.pdf');
  assert.equal(parts[0].blob.type, 'application/pdf');

  // Regression: standard adaptive export must never return a PDF above its configured cap.
  const strictApi = global.PTI093PdfBuilder.install({ state, PDF_SAFE_LIMIT: 1 });
  await assert.rejects(
    () => strictApi.buildAdaptivePdf([canvas]),
    /Không xuất tệp vượt giới hạn/,
    'adaptive compression must fail clearly if every compression level remains oversized'
  );
  console.log('PDF Builder Core tests passed: adaptive compression, splitting, and strict size cap.');
})().catch(error => { console.error(error); process.exitCode = 1; });
