import { openDB } from 'idb';

const DB_NAME = 'attachtrack-offline';
const DB_VERSION = 2;
const LEGACY_QUEUE = 'submissionsQueue';

let dbPromise = null;

async function migrateLegacyQueue(db, transaction) {
  if (!db.objectStoreNames.contains(LEGACY_QUEUE)) return;

  const legacy = transaction.objectStore(LEGACY_QUEUE);
  const outbox = transaction.objectStore('outbox');
  const blobs = transaction.objectStore('blobs');

  let cursor = await legacy.openCursor();
  while (cursor) {
    const item = cursor.value;
    if (item && item.clientUuid && item.file) {
      const fileId = `${item.clientUuid}:legacy`;
      const createdAt = Date.parse(item.submittedAt) || Date.now();
      await blobs.put({ id: fileId, outboxId: item.clientUuid, blob: item.file });
      await outbox.put({
        id: item.clientUuid,
        type: 'submission.create',
        userId: null,
        status: item.status === 'failed' ? 'failed' : 'pending',
        priority: 1,
        entityKey: `submission:${item.clientUuid}`,
        label: item.fileName || 'Document',
        payload: { recipientRole: item.recipientRole },
        files: [
          {
            id: fileId,
            name: item.fileName || 'document',
            type: item.fileType || item.file.type || 'application/octet-stream',
            size: item.file.size || 0,
          },
        ],
        progress: {},
        attempts: 0,
        nextAttemptAt: 0,
        error: item.errorMessage || null,
        errorCode: null,
        clientCreatedAt: item.submittedAt || new Date(createdAt).toISOString(),
        clockOffsetMs: null,
        createdAt,
        updatedAt: Date.now(),
        syncStartedAt: null,
        syncedAt: null,
      });
    }
    cursor = await cursor.continue();
  }

  db.deleteObjectStore(LEGACY_QUEUE);
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore('session', { keyPath: 'id' });
        }

        if (oldVersion < 2) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
          outbox.createIndex('status', 'status');
          outbox.createIndex('type', 'type');
          outbox.createIndex('userId', 'userId');
          outbox.createIndex('entityKey', 'entityKey');
          outbox.createIndex('createdAt', 'createdAt');

          const blobs = db.createObjectStore('blobs', { keyPath: 'id' });
          blobs.createIndex('outboxId', 'outboxId');

          const cache = db.createObjectStore('cache', { keyPath: 'key' });
          cache.createIndex('userId', 'userId');

          db.createObjectStore('meta', { keyPath: 'key' });
          db.createObjectStore('idmap', { keyPath: 'key' });

          if (oldVersion === 1) {
            migrateLegacyQueue(db, transaction).catch(() => {});
          }
        }
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then((db) => db.close()).catch(() => {});
        }
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function saveSession(sessionData) {
  const db = await getDB();
  await db.put('session', { id: 'current', ...sessionData, cachedAt: Date.now() });
}

export async function getSession() {
  const db = await getDB();
  return db.get('session', 'current');
}

export async function clearSession() {
  const db = await getDB();
  await db.delete('session', 'current');
}

export async function metaGet(key) {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row ? row.value : undefined;
}

export async function metaSet(key, value) {
  const db = await getDB();
  await db.put('meta', { key, value, updatedAt: Date.now() });
}
