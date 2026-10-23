const assert = require('node:assert/strict');

global.window = global;
require('../core/local-draft-store.js');

const store = global.PTILocalDraftStore.install({ dbName: 'pti093_test_drafts' });
const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'indexedDB');

function restoreIndexedDB() {
  if (originalDescriptor) Object.defineProperty(global, 'indexedDB', originalDescriptor);
  else delete global.indexedDB;
}

(async () => {
  try {
    // Unsupported browsers must reject clearly instead of leaving callers waiting.
    delete global.indexedDB;
    await assert.rejects(
      store.openLocalDraftDB(),
      /không hỗ trợ lưu nháp/i,
      'missing IndexedDB should reject with a user-readable error'
    );

    // Privacy settings / browser policy can make the indexedDB getter throw SecurityError.
    Object.defineProperty(global, 'indexedDB', {
      configurable: true,
      get() {
        const error = new Error('Access to the storage is not allowed from this context.');
        error.name = 'SecurityError';
        throw error;
      }
    });
    await assert.rejects(
      store.openLocalDraftDB(),
      error => error && error.name === 'SecurityError',
      'a blocked IndexedDB getter should reject instead of crashing or hanging'
    );

    // Draft Recovery must convert that rejection into a recoverable warning, not a false success.
    require('../core/draft-recovery.js');
    const messages = [];
    const element = id => ({
      value: id === 'gdv' ? '' : '',
      textContent: '',
      dataset: {},
      options: [],
      classList: { add() {}, remove() {}, toggle() {} }
    });
    const recovery = global.PTI093DraftRecovery.install({
      state: {
        groups: [], current: { title: 'Bản ảnh chi tiết thiệt hại', items: [] },
        editing: -1, pages: [], pageDefs: [], driveRecordId: '',
        localDraftId: '', orientation: 'portrait', per: 6, addSeq: 0
      },
      $: element,
      getDateISO: () => '2026-10-23',
      setDateInput() {},
      render() {},
      renderLayout() {},
      setDriveState() {},
      msg: text => messages.push(text),
      openLocalDraftDB: () => store.openLocalDraftDB(),
      localDraftTransactionDone: async () => {},
      getLocalDrafts: async () => []
    });
    await assert.doesNotReject(recovery.restoreAutoDraft(), 'blocked IndexedDB should not escape the recovery boundary');
    assert.equal(messages.some(text => /Đã khôi phục công việc/.test(text)), false, 'blocked IndexedDB must never be reported as restored');
    assert.ok(messages.some(text => /Chưa đọc được bản nháp/.test(text)), 'blocked IndexedDB should show a recoverable draft warning');

    // Some implementations expose IndexedDB but throw synchronously from open().
    Object.defineProperty(global, 'indexedDB', {
      configurable: true,
      value: {
        open() {
          const error = new Error('IndexedDB open blocked');
          error.name = 'SecurityError';
          throw error;
        }
      }
    });
    await assert.rejects(
      store.openLocalDraftDB(),
      error => error && error.name === 'SecurityError',
      'a synchronous open() exception should reject'
    );

    // Asynchronous request errors must also settle the promise.
    Object.defineProperty(global, 'indexedDB', {
      configurable: true,
      value: {
        open() {
          const request = {};
          queueMicrotask(() => {
            request.error = new Error('IndexedDB request failed');
            request.onerror && request.onerror();
          });
          return request;
        }
      }
    });
    await assert.rejects(
      store.openLocalDraftDB(),
      /IndexedDB request failed/,
      'an asynchronous open request error should reject'
    );

    // Transaction completion is part of the persistence contract: abort/error must reject,
    // while complete resolves. This prevents callers from treating partial writes as success.
    const abortedTx = {};
    const abortedPromise = store.localDraftTransactionDone(abortedTx);
    const abortError = new Error('Synthetic transaction abort');
    abortedTx.error = abortError;
    abortedTx.onabort();
    await assert.rejects(abortedPromise, error => error === abortError,
      'an aborted write transaction must reject with the transaction error');

    const completedTx = {};
    const completedPromise = store.localDraftTransactionDone(completedTx);
    completedTx.oncomplete();
    await assert.doesNotReject(completedPromise,
      'a completed write transaction should resolve');

    console.log('Local Draft Store IndexedDB blocked/unavailable tests passed.');
  } finally {
    restoreIndexedDB();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
