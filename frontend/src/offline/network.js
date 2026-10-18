import { API_BASE_URL } from '../api/config';
import { recordServerTime } from './clock';

const PING_TIMEOUT_MS = 6000;
const PROBE_TICK_MS = 15000;
const ONLINE_REFRESH_MS = 5 * 60 * 1000;
const WINDOW_MS = 2 * 60 * 1000;
const RESTORED_EVENT = 'attachtrack:network-restored';

let state = {
  status: 'online',
  reachable: 'unknown',
  lastOkAt: null,
  lastFailAt: null,
  checking: false,
};

const listeners = new Set();
const recent = [];
let consecutiveFailures = 0;
let monitorStarted = false;
let probeTimer = null;
let checkPromise = null;

function computeStatus(reachable) {
  const cutoff = Date.now() - WINDOW_MS;
  while (recent.length > 0 && recent[0].at < cutoff) recent.shift();
  if (reachable === 'no') return 'offline';
  const failures = recent.filter((item) => !item.ok).length;
  const successes = recent.filter((item) => item.ok).length;
  if (failures >= 2 && successes >= 1) return 'unstable';
  return 'online';
}

function commit(patch) {
  const next = { ...state, ...patch };
  next.status = computeStatus(next.reachable);
  const changed = Object.keys(next).some((key) => next[key] !== state[key]);
  if (!changed) return;
  const wasDown = state.status === 'offline';
  state = next;
  listeners.forEach((listener) => listener());
  if (wasDown && next.status !== 'offline') {
    window.dispatchEvent(new CustomEvent(RESTORED_EVENT));
  }
}

export function getNetworkSnapshot() {
  return state;
}

export function subscribeNetwork(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onNetworkRestored(handler) {
  window.addEventListener(RESTORED_EVENT, handler);
  return () => window.removeEventListener(RESTORED_EVENT, handler);
}

export function reportRequestSuccess() {
  consecutiveFailures = 0;
  if (state.reachable === 'no') recent.length = 0;
  recent.push({ ok: true, at: Date.now() });
  commit({ reachable: 'yes', lastOkAt: Date.now() });
}

export function reportRequestFailure() {
  consecutiveFailures += 1;
  recent.push({ ok: false, at: Date.now() });
  const offline = consecutiveFailures >= 2 || navigator.onLine === false;
  commit({
    reachable: offline ? 'no' : state.reachable,
    lastFailAt: Date.now(),
  });
}

export function markOffline() {
  consecutiveFailures = Math.max(consecutiveFailures, 2);
  commit({ reachable: 'no', lastFailAt: Date.now() });
}

export function isOffline() {
  return state.status === 'offline';
}

export function checkConnection() {
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    commit({ checking: true });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const sentAt = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/sync/ping`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const receivedAt = Date.now();
      if (response.ok) {
        const body = await response.json().catch(() => null);
        const serverTime = body && body.data ? body.data.serverTime : null;
        if (serverTime) recordServerTime(serverTime, sentAt, receivedAt);
      }
      reportRequestSuccess();
      return true;
    } catch {
      consecutiveFailures = Math.max(consecutiveFailures, 2);
      recent.push({ ok: false, at: Date.now() });
      commit({ reachable: 'no', lastFailAt: Date.now() });
      return false;
    } finally {
      clearTimeout(timer);
      commit({ checking: false });
    }
  })();

  const clear = () => {
    checkPromise = null;
  };
  checkPromise.then(clear, clear);
  return checkPromise;
}

function probeTick() {
  const idleFor = state.lastOkAt ? Date.now() - state.lastOkAt : Infinity;
  if (state.status !== 'online' || idleFor > ONLINE_REFRESH_MS) {
    checkConnection();
  }
}

export function startNetworkMonitor() {
  if (monitorStarted) return () => {};
  monitorStarted = true;

  const handleOnline = () => {
    checkConnection();
  };
  const handleOffline = () => {
    markOffline();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') probeTick();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibility);
  probeTimer = setInterval(probeTick, PROBE_TICK_MS);

  if (navigator.onLine === false) {
    markOffline();
  } else {
    checkConnection();
  }

  return () => {
    monitorStarted = false;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (probeTimer) clearInterval(probeTimer);
    probeTimer = null;
  };
}
