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

    console.log('Local Draft Store IndexedDB blocked/unavailable tests passed.');
  } finally {
    restoreIndexedDB();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
