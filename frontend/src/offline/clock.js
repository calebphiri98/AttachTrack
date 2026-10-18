import { metaGet, metaSet } from './db';

const META_KEY = 'clockOffsetMs';
const MAX_PLAUSIBLE_OFFSET_MS = 365 * 24 * 60 * 60 * 1000;

let offsetMs = null;
let loadPromise = null;

export function loadClockOffset() {
  if (!loadPromise) {
    loadPromise = metaGet(META_KEY)
      .then((stored) => {
        if (offsetMs === null && Number.isFinite(stored)) offsetMs = stored;
        return offsetMs;
      })
      .catch(() => offsetMs);
  }
  return loadPromise;
}

export function getClockOffsetMs() {
  return offsetMs;
}

export function recordServerTime(serverIso, sentAt, receivedAt) {
  const serverMs = Date.parse(serverIso);
  if (!Number.isFinite(serverMs)) return;
  const midpoint = sentAt + (receivedAt - sentAt) / 2;
  const measured = Math.round(serverMs - midpoint);
  if (Math.abs(measured) > MAX_PLAUSIBLE_OFFSET_MS) return;
  offsetMs = measured;
  metaSet(META_KEY, measured).catch(() => {});
}

export function captureTiming() {
  return {
    clientCreatedAt: new Date().toISOString(),
    clockOffsetMs: offsetMs,
  };
}
