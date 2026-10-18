import {
  STATUS,
  claimNext,
  claimSpecific,
  listRecords,
  markFailed,
  markSynced,
  purgeSynced,
  recoverStale,
  releaseRecord,
  removeRecord,
  retryAllFailed,
  retryRecord,
  updateRecord,
} from './outbox';
import { executeRecord, summarizeResult } from './executor';
import { cachePrune } from './cache';
import {
  checkConnection,
  getNetworkSnapshot,
  onNetworkRestored,
  startNetworkMonitor,
} from './network';
import { loadClockOffset } from './clock';

const SYNC_EVENT = 'attachtrack:sync-finished';
const MAX_TRANSIENT_ATTEMPTS = 6;
const BASE_RETRY_MS = 5000;
const MAX_RETRY_MS = 5 * 60 * 1000;
const POLL_MS = 45000;

let currentUserId = null;
let running = false;
let started = false;
let retryTimer = null;
let backoffStep = 0;
let pollTimer = null;
let stopMonitor = null;
const listeners = new Set();
let snapshot = { running: false, lastRunAt: null, lastSyncedAt: null, lastError: null };

function setSnapshot(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

export function getSyncSnapshot() {
  return snapshot;
}

export function subscribeSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onSyncFinished(handler) {
  window.addEventListener(SYNC_EVENT, handler);
  return () => window.removeEventListener(SYNC_EVENT, handler);
}

export function classifyError(err) {
  if (err && err.isNetworkError) return 'network';
  if (!err || !err.statusCode) return 'permanent';
  if (err.statusCode === 401) return 'auth';
  if (err.statusCode === 409 && err.code === 'IN_PROGRESS') return 'transient';
  if ([408, 425, 429, 500, 502, 503, 504].includes(err.statusCode)) return 'transient';
  return 'permanent';
}

function retryDelay(attempt) {
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempt - 1));
}

async function settleFailure(record, err, kind) {
  if (kind === 'network' || kind === 'auth') {
    await releaseRecord(record.id, { lastErrorAt: Date.now() });
    return 'stop';
  }

  if (kind === 'transient') {
    const attempts = (record.attempts || 0) + 1;
    if (attempts >= MAX_TRANSIENT_ATTEMPTS) {
      await markFailed(record.id, {
        message: err.message || 'The server could not process this item. Try again later.',
        code: err.code || null,
        statusCode: err.statusCode || null,
      });
      return 'failed';
    }
    await releaseRecord(record.id, {
      attempts,
      nextAttemptAt: Date.now() + retryDelay(attempts),
      lastErrorAt: Date.now(),
    });
    return 'deferred';
  }

  await markFailed(record.id, {
    message: err.message,
    code: err.code || null,
    statusCode: err.statusCode || null,
  });
  return 'failed';
}

async function processRecord(record) {
  try {
    const result = await executeRecord(record);
    await markSynced(record.id, summarizeResult(record.type, result));
    return { outcome: 'synced', result };
  } catch (err) {
    const kind = classifyError(err);
    const verdict = await settleFailure(record, err, kind);
    return { outcome: verdict, error: err, kind };
  }
}

function announceFinished(summary) {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: summary }));
}

async function runLocked() {
  if (running || !currentUserId) return null;
  running = true;
  setSnapshot({ running: true });

  const summary = { synced: 0, failed: 0, deferred: 0, types: [], stoppedByNetwork: false };
  const blocked = new Set();

  try {
    await recoverStale();

    for (;;) {
      const record = await claimNext(currentUserId, blocked);
      if (!record) break;

      const outcome = await processRecord(record);

      if (outcome.outcome === 'synced') {
        summary.synced += 1;
        summary.types.push(record.type);
        backoffStep = 0;
        continue;
      }
      if (record.entityKey) blocked.add(record.entityKey);
      if (outcome.outcome === 'failed') {
        summary.failed += 1;
        continue;
      }
      if (outcome.outcome === 'deferred') {
        summary.deferred += 1;
        continue;
      }
      summary.stoppedByNetwork = true;
      break;
    }
  } catch (err) {
    setSnapshot({ lastError: err && err.message ? err.message : 'Sync failed' });
  } finally {
    running = false;
    setSnapshot({
      running: false,
      lastRunAt: Date.now(),
      lastSyncedAt: summary.synced > 0 ? Date.now() : snapshot.lastSyncedAt,
    });
  }

  if (summary.synced > 0 || summary.failed > 0) announceFinished(summary);
  await scheduleNext(summary);
  return summary;
}

async function scheduleNext(summary) {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (!currentUserId) return;

  const waiting = await listRecords({ userId: currentUserId, statuses: [STATUS.PENDING] });
  if (waiting.length === 0) return;

  let delay;
  if (summary && summary.stoppedByNetwork) {
    backoffStep += 1;
    delay = retryDelay(backoffStep);
  } else {
    const soonest = Math.min(...waiting.map((item) => item.nextAttemptAt || 0));
    delay = Math.max(1000, soonest - Date.now());
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    triggerSync('timer');
  }, delay);
}

export function triggerSync() {
  if (!currentUserId) return Promise.resolve(null);

  const execute = () => runLocked();

  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
    return navigator.locks
      .request('attachtrack-sync', { ifAvailable: true }, async (lock) => {
        if (!lock) return null;
        return execute();
      })
      .catch(() => execute());
  }
  return execute();
}

export async function runRecordNow(recordId) {
  if (!currentUserId) return { state: 'queued' };

  const claimed = await claimSpecific(recordId, currentUserId);
  if (!claimed) {
    triggerSync('queue');
    return { state: 'queued' };
  }

  try {
    const result = await executeRecord(claimed);
    await markSynced(claimed.id, summarizeResult(claimed.type, result));
    announceFinished({ synced: 1, failed: 0, deferred: 0, types: [claimed.type], foreground: true });
    return { state: 'synced', result };
  } catch (err) {
    const kind = classifyError(err);
    if (kind === 'permanent') {
      await removeRecord(claimed.id, { cascade: false });
      throw err;
    }
    await settleFailure(claimed, err, kind);
    scheduleNext({ stoppedByNetwork: kind === 'network' });
    return { state: 'queued', reason: kind };
  }
}

export async function retryNow(recordId) {
  await retryRecord(recordId);
  return triggerSync('manual');
}

export async function retryAllNow() {
  if (!currentUserId) return 0;
  const count = await retryAllFailed(currentUserId);
  await triggerSync('manual');
  return count;
}

export async function discardRecord(recordId) {
  const removed = await removeRecord(recordId);
  triggerSync('discard');
  return removed;
}

export async function markRecordSeen(recordId) {
  return updateRecord(recordId, { seenAt: Date.now() });
}

export function getSyncUserId() {
  return currentUserId;
}

export function setSyncUser(userId) {
  currentUserId = userId || null;
  backoffStep = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (currentUserId) {
    purgeSynced().catch(() => {});
    cachePrune().catch(() => {});
    triggerSync('start');
  }
}

export function startSyncEngine() {
  if (started) return () => {};
  started = true;

  loadClockOffset();
  stopMonitor = startNetworkMonitor();

  const stopRestored = onNetworkRestored(() => triggerSync('network-restored'));
  const handleVisible = () => {
    if (document.visibilityState === 'visible') {
      if (getNetworkSnapshot().status === 'offline') {
        checkConnection();
      } else {
        triggerSync('visible');
      }
    }
  };
  const handleFocus = () => triggerSync('focus');
  const handlePageShow = (event) => {
    if (event.persisted) triggerSync('pageshow');
  };

  document.addEventListener('visibilitychange', handleVisible);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('pageshow', handlePageShow);
  pollTimer = setInterval(() => {
    if (getNetworkSnapshot().status !== 'offline') triggerSync('poll');
  }, POLL_MS);

  return () => {
    started = false;
    stopRestored();
    if (stopMonitor) stopMonitor();
    document.removeEventListener('visibilitychange', handleVisible);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('pageshow', handlePageShow);
    if (pollTimer) clearInterval(pollTimer);
    if (retryTimer) clearTimeout(retryTimer);
    pollTimer = null;
    retryTimer = null;
  };
}
