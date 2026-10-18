import { getDB } from './db';

const CHANGE_EVENT = 'attachtrack:outbox-changed';
const STALE_SYNCING_MS = 12 * 60 * 1000;
const SYNCED_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export const STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
};

let channel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('attachtrack-outbox');
    channel.onmessage = () => {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    };
  }
} catch {
  channel = null;
}

function announce() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  if (channel) {
    try {
      channel.postMessage('changed');
    } catch {
      channel = null;
    }
  }
}

export function subscribeOutbox(listener) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

function randomSuffix() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

function describeFile(recordId, file) {
  return {
    id: `${recordId}:${randomSuffix()}`,
    name: file.name || 'file',
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
  };
}

async function deleteBlobs(tx, fileMetas) {
  const store = tx.objectStore('blobs');
  await Promise.all((fileMetas || []).map((meta) => store.delete(meta.id)));
}

export async function createRecord({
  id = crypto.randomUUID(),
  type,
  userId,
  payload = {},
  files = [],
  entityKey = null,
  label = '',
  priority = 1,
  coalesce = false,
  timing,
}) {
  const db = await getDB();
  const tx = db.transaction(['outbox', 'blobs'], 'readwrite');
  const outbox = tx.objectStore('outbox');
  const blobs = tx.objectStore('blobs');
  const now = Date.now();

  let existing = null;
  if (coalesce && entityKey) {
    const siblings = await outbox.index('entityKey').getAll(entityKey);
    existing =
      siblings.find(
        (item) =>
          item.type === type &&
          item.userId === userId &&
          (item.status === STATUS.PENDING || item.status === STATUS.FAILED)
      ) || null;
  }

  const recordId = existing ? existing.id : id;
  const fileMetas = files.map((file) => describeFile(recordId, file));

  if (existing) {
    await deleteBlobs(tx, existing.files);
  }

  await Promise.all(
    files.map((file, index) =>
      blobs.put({ id: fileMetas[index].id, outboxId: recordId, blob: file })
    )
  );

  const record = existing
    ? {
        ...existing,
        payload,
        files: fileMetas,
        label,
        status: STATUS.PENDING,
        progress: {},
        attempts: 0,
        nextAttemptAt: 0,
        error: null,
        errorCode: null,
        updatedAt: now,
      }
    : {
        id: recordId,
        type,
        userId,
        status: STATUS.PENDING,
        priority,
        entityKey,
        label,
        payload,
        files: fileMetas,
        progress: {},
        attempts: 0,
        nextAttemptAt: 0,
        error: null,
        errorCode: null,
        clientCreatedAt: timing ? timing.clientCreatedAt : new Date(now).toISOString(),
        clockOffsetMs: timing ? timing.clockOffsetMs : null,
        createdAt: now,
        updatedAt: now,
        syncStartedAt: null,
        syncedAt: null,
      };

  await outbox.put(record);
  await tx.done;
  announce();
  return record;
}

export async function getRecord(id) {
  const db = await getDB();
  return db.get('outbox', id);
}

export async function listRecords({ userId, statuses, typePrefix, entityKey } = {}) {
  const db = await getDB();
  const all = entityKey
    ? await db.getAllFromIndex('outbox', 'entityKey', entityKey)
    : await db.getAll('outbox');

  return all
    .filter((item) => {
      if (userId && item.userId && item.userId !== userId) return false;
      if (statuses && !statuses.includes(item.status)) return false;
      if (typePrefix && !item.type.startsWith(typePrefix)) return false;
      return true;
    })
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function countRecords(userId) {
  const records = await listRecords({ userId });
  const counts = { pending: 0, syncing: 0, failed: 0, synced: 0 };
  records.forEach((item) => {
    counts[item.status] += 1;
  });
  return counts;
}

export async function updateRecord(id, patch) {
  const db = await getDB();
  const tx = db.transaction('outbox', 'readwrite');
  const current = await tx.store.get(id);
  if (!current) {
    await tx.done;
    return null;
  }
  const changes = typeof patch === 'function' ? patch(current) : patch;
  const next = { ...current, ...changes, updatedAt: Date.now() };
  await tx.store.put(next);
  await tx.done;
  announce();
  return next;
}

export async function patchRecord(id, { payload, addFiles = [], removeFileIds = [], label }) {
  const db = await getDB();
  const tx = db.transaction(['outbox', 'blobs'], 'readwrite');
  const outbox = tx.objectStore('outbox');
  const blobs = tx.objectStore('blobs');
  const current = await outbox.get(id);

  if (!current) {
    await tx.done;
    throw new Error('This item is no longer on this device');
  }
  if (current.status === STATUS.SYNCING) {
    await tx.done;
    const error = new Error('This item is being sent right now. Try again in a moment.');
    error.code = 'SYNCING';
    throw error;
  }
  if (current.status === STATUS.SYNCED) {
    await tx.done;
    const error = new Error('This item has already been sent.');
    error.code = 'SYNCED';
    throw error;
  }

  const removing = current.files.filter((meta) => removeFileIds.includes(meta.id));
  await deleteBlobs(tx, removing);
  const kept = current.files.filter((meta) => !removeFileIds.includes(meta.id));
  const added = addFiles.map((file) => describeFile(id, file));
  await Promise.all(addFiles.map((file, index) => blobs.put({ id: added[index].id, outboxId: id, blob: file })));

  const next = {
    ...current,
    payload: payload || current.payload,
    label: label === undefined ? current.label : label,
    files: [...kept, ...added],
    status: STATUS.PENDING,
    error: null,
    errorCode: null,
    attempts: 0,
    nextAttemptAt: 0,
    updatedAt: Date.now(),
  };
  await outbox.put(next);
  await tx.done;
  announce();
  return next;
}

export async function getFiles(record) {
  const db = await getDB();
  const result = [];
  for (const meta of record.files || []) {
    const row = await db.get('blobs', meta.id);
    if (row && row.blob) {
      const file =
        row.blob instanceof File
          ? row.blob
          : new File([row.blob], meta.name, { type: meta.type });
      result.push({ meta, file });
    }
  }
  return result;
}

export async function claimNext(userId, blockedEntities = new Set()) {
  const db = await getDB();
  const tx = db.transaction('outbox', 'readwrite');
  const all = await tx.store.getAll();
  const now = Date.now();

  const failedAt = new Map();
  const busy = new Set();
  all.forEach((item) => {
    if (!item.entityKey) return;
    if (item.status === STATUS.FAILED) {
      const known = failedAt.get(item.entityKey);
      if (known === undefined || item.createdAt < known) failedAt.set(item.entityKey, item.createdAt);
    }
    if (item.status === STATUS.SYNCING) busy.add(item.entityKey);
  });

  const candidates = all
    .filter((item) => {
      if (item.status !== STATUS.PENDING) return false;
      if (item.userId && item.userId !== userId) return false;
      if ((item.nextAttemptAt || 0) > now) return false;
      if (item.entityKey) {
        if (blockedEntities.has(item.entityKey)) return false;
        if (busy.has(item.entityKey)) return false;
        const failedFrom = failedAt.get(item.entityKey);
        if (failedFrom !== undefined && failedFrom <= item.createdAt) return false;
      }
      return true;
    })
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);

  const chosen = candidates[0];
  if (!chosen) {
    await tx.done;
    return null;
  }

  const claimed = { ...chosen, status: STATUS.SYNCING, userId, syncStartedAt: now, updatedAt: now };
  await tx.store.put(claimed);
  await tx.done;
  announce();
  return claimed;
}

export async function claimSpecific(id, userId) {
  const db = await getDB();
  const tx = db.transaction('outbox', 'readwrite');
  const all = await tx.store.getAll();
  const target = all.find((item) => item.id === id);

  if (!target || target.status !== STATUS.PENDING) {
    await tx.done;
    return null;
  }

  const earlier = all.some(
    (item) =>
      item.id !== id &&
      target.entityKey &&
      item.entityKey === target.entityKey &&
      item.createdAt < target.createdAt &&
      item.status !== STATUS.SYNCED
  );
  if (earlier) {
    await tx.done;
    return null;
  }

  const now = Date.now();
  const claimed = { ...target, status: STATUS.SYNCING, userId, syncStartedAt: now, updatedAt: now };
  await tx.store.put(claimed);
  await tx.done;
  announce();
  return claimed;
}

export async function releaseRecord(id, patch = {}) {
  return updateRecord(id, { status: STATUS.PENDING, syncStartedAt: null, ...patch });
}

export async function markSynced(id, summary = null) {
  const db = await getDB();
  const tx = db.transaction(['outbox', 'blobs'], 'readwrite');
  const current = await tx.objectStore('outbox').get(id);
  if (!current) {
    await tx.done;
    return null;
  }
  await deleteBlobs(tx, current.files);
  const next = {
    ...current,
    status: STATUS.SYNCED,
    syncedAt: Date.now(),
    syncStartedAt: null,
    error: null,
    errorCode: null,
    result: summary,
    updatedAt: Date.now(),
  };
  await tx.objectStore('outbox').put(next);
  await tx.done;
  announce();
  return next;
}

export async function markFailed(id, { message, code = null, statusCode = null }) {
  return updateRecord(id, {
    status: STATUS.FAILED,
    syncStartedAt: null,
    error: message || 'This item could not be sent.',
    errorCode: code,
    errorStatus: statusCode,
  });
}

export async function retryRecord(id) {
  return updateRecord(id, {
    status: STATUS.PENDING,
    attempts: 0,
    nextAttemptAt: 0,
    error: null,
    errorCode: null,
    errorStatus: null,
    syncStartedAt: null,
  });
}

export async function retryAllFailed(userId) {
  const failed = await listRecords({ userId, statuses: [STATUS.FAILED] });
  const retryable = failed.filter((item) => item.errorCode !== 'RECORD_LOCKED');
  await Promise.all(retryable.map((item) => retryRecord(item.id)));
  return retryable.length;
}

export async function removeRecord(id, { cascade = true } = {}) {
  const db = await getDB();
  const tx = db.transaction(['outbox', 'blobs'], 'readwrite');
  const outbox = tx.objectStore('outbox');
  const target = await outbox.get(id);
  if (!target) {
    await tx.done;
    return 0;
  }

  const doomed = [target];
  if (cascade && target.type.endsWith('.create') && target.entityKey) {
    const siblings = await outbox.index('entityKey').getAll(target.entityKey);
    siblings.forEach((item) => {
      if (item.id !== target.id && item.status !== STATUS.SYNCED) doomed.push(item);
    });
  }

  for (const item of doomed) {
    await deleteBlobs(tx, item.files);
    await outbox.delete(item.id);
  }
  await tx.done;
  announce();
  return doomed.length;
}

export async function recoverStale() {
  const db = await getDB();
  const tx = db.transaction('outbox', 'readwrite');
  const all = await tx.store.index('status').getAll(STATUS.SYNCING);
  const cutoff = Date.now() - STALE_SYNCING_MS;
  let recovered = 0;
  for (const item of all) {
    if ((item.syncStartedAt || 0) < cutoff) {
      await tx.store.put({ ...item, status: STATUS.PENDING, syncStartedAt: null });
      recovered += 1;
    }
  }
  await tx.done;
  if (recovered > 0) announce();
  return recovered;
}

export async function purgeSynced() {
  const db = await getDB();
  const tx = db.transaction(['outbox', 'blobs'], 'readwrite');
  const synced = await tx.objectStore('outbox').index('status').getAll(STATUS.SYNCED);
  const cutoff = Date.now() - SYNCED_RETENTION_MS;
  for (const item of synced) {
    if ((item.syncedAt || 0) < cutoff) {
      await deleteBlobs(tx, item.files);
      await tx.objectStore('outbox').delete(item.id);
    }
  }
  await tx.done;
  announce();
}

export async function clearSynced(userId) {
  const synced = await listRecords({ userId, statuses: [STATUS.SYNCED] });
  const db = await getDB();
  const tx = db.transaction('outbox', 'readwrite');
  await Promise.all(synced.map((item) => tx.store.delete(item.id)));
  await tx.done;
  announce();
}

export async function setMapping(key, value) {
  const db = await getDB();
  await db.put('idmap', { key, value, updatedAt: Date.now() });
}

export async function getMapping(key) {
  const db = await getDB();
  const row = await db.get('idmap', key);
  return row ? row.value : null;
}

export async function hasUnsynced(userId) {
  const records = await listRecords({
    userId,
    statuses: [STATUS.PENDING, STATUS.SYNCING, STATUS.FAILED],
  });
  return records.length;
}
