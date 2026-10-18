import { metaGet, metaSet } from './db';

export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') return false;
    const already = typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;
    const granted = already || (await navigator.storage.persist());
    await metaSet('persistentStorage', Boolean(granted));
    return Boolean(granted);
  } catch {
    return false;
  }
}

export async function getStorageStatus() {
  let persisted = null;
  let usage = null;
  let quota = null;

  try {
    if (navigator.storage && typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    } else {
      const stored = await metaGet('persistentStorage');
      persisted = typeof stored === 'boolean' ? stored : null;
    }
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage ?? null;
      quota = estimate.quota ?? null;
    }
  } catch {
    return { persisted, usage, quota };
  }

  return { persisted, usage, quota };
}
