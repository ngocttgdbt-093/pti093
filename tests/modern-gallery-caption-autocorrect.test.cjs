const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:4173/tests/modern-gallery-caption-autocorrect.html');
    const caption = page.locator('#pcSavedGroupsGallery textarea').first();
    await caption.waitFor();

    await caption.fill('  tổn   thất xe. hư hỏng  ');
    assert.equal(await caption.inputValue(), 'Tổn thất xe. Hư hỏng ',
      'typing silently normalizes spacing and sentence capitalization while preserving trailing space');
    assert.equal(await page.evaluate(() => state.groups[0].items[0].caption), 'Tổn thất xe. Hư hỏng ',
      'normalized text is immediately reflected in the saved group model');
    assert.deepEqual(await page.evaluate(() => window.__saveFlags), [false],
      'typing requests metadata-only autosave');

    await caption.blur();
    assert.equal(await caption.inputValue(), 'Tổn thất xe. Hư hỏng',
      'blur trims the trailing space');
    assert.equal(await page.evaluate(() => state.groups[0].items[0].caption), 'Tổn thất xe. Hư hỏng',
      'trimmed text remains in the model');
    assert.deepEqual(await page.evaluate(() => window.__saveFlags), [false, false],
      'blur normalization is persisted as metadata-only without marking image data dirty');

    await caption.fill('va chạm! kính vỡ');
    assert.equal(await caption.inputValue(), 'Va chạm! Kính vỡ',
      'sentence after punctuation is capitalized on direct individual entry');
    assert.equal(await page.evaluate(() => state.groups[0].items[0].caption), 'Va chạm! Kính vỡ');
    assert.equal(await page.locator('[role=alert]').count(), 0,
      'AutoCorrect does not display a notification');
    console.log('PASS: modern saved-group individual captions AutoCorrect silently and autosave safely');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
