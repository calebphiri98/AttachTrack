import { getDB } from './db';

const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

function keyFor(userId, path) {
  return `${userId}|${path}`;
}

export async function cacheGet(userId, path) {
  if (!userId) return null;
  const db = await getDB();
  const row = await db.get('cache', keyFor(userId, path));
  return row ? { data: row.data, cachedAt: row.cachedAt } : null;
}

export async function cachePut(userId, path, data) {
  if (!userId) return;
  const db = await getDB();
  await db.put('cache', {
    key: keyFor(userId, path),
    userId,
    path,
    data,
    cachedAt: Date.now(),
  });
}

export async function cacheClearUser(userId) {
  const db = await getDB();
  const tx = db.transaction('cache', 'readwrite');
  const keys = await tx.store.index('userId').getAllKeys(userId);
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}

export async function cacheClearAll() {
  const db = await getDB();
  await db.clear('cache');
}

export async function cachePrune() {
  const db = await getDB();
  const tx = db.transaction('cache', 'readwrite');
  const cutoff = Date.now() - MAX_AGE_MS;
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (cursor.value.cachedAt < cutoff) await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
