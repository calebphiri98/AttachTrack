const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function run(store, callback) {
  return storage.run(store, callback);
}

function getTiming() {
  const store = storage.getStore();
  return store && store.timing ? store.timing : null;
}

function getTrustedNow() {
  const timing = getTiming();
  return timing ? timing.trustedAt : new Date();
}

module.exports = { run, getTiming, getTrustedNow };
