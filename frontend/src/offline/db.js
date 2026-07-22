import { openDB } from 'idb';

const DB_NAME = 'attachtrack-offline';
const DB_VERSION = 1;

// Phase 5 scope: define the schema only. Nothing writes to `submissionsQueue`
// yet — that logic belongs to Phase 6. `session` exists now because cached
// login (replacing the current localStorage stand-in in AuthContext) is
// also part of Phase 5.

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Single cached record: the current user's session for offline login.
        // keyPath 'id' with a fixed value ('current') since there's only ever one.
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'id' });
        }

        // Phase 6 will read/write here. Schema decided now so Phase 6 doesn't
        // need a version bump: clientUuid is the dedup key (matches the
        // backend's submissions.client_uuid column), status tracks
        // pending_sync/synced/failed for the "Pending sync" UI indicator.
        if (!db.objectStoreNames.contains('submissionsQueue')) {
          const store = db.createObjectStore('submissionsQueue', { keyPath: 'clientUuid' });
          store.createIndex('status', 'status');
          store.createIndex('submittedAt', 'submittedAt');
        }
      },
    });
  }
  return dbPromise;
}

// ---- Session (cached login) ----

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
// ---- Offline submissions queue (Phase 6) ----

export async function enqueueSubmission(item) {
  const db = await getDB();
  await db.put('submissionsQueue', item);
}

export async function getQueuedSubmissions() {
  const db = await getDB();
  return db.getAll('submissionsQueue');
}

export async function removeQueuedSubmission(clientUuid) {
  const db = await getDB();
  await db.delete('submissionsQueue', clientUuid);
}