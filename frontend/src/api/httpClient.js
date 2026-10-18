import { API_BASE_URL, REFRESH_KEY } from './config';
import { cacheGet, cachePut } from '../offline/cache';
import {
  getNetworkSnapshot,
  reportRequestFailure,
  reportRequestSuccess,
} from '../offline/network';

const DEFAULT_TIMEOUT_MS = 15000;
const SOFT_CACHE_TIMEOUT_MS = 5000;
const NO_CACHE_PREFIXES = ['/auth/', '/sync/'];

let accessToken = null;
let onUnauthorized = null;
let refreshPromise = null;
let lastRefreshFailure = null;
let currentUserId = null;

function setAccessToken(token) {
  accessToken = token;
}

function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function setCurrentUserId(userId) {
  currentUserId = userId || null;
}

function getRefreshFailure() {
  return lastRefreshFailure;
}

function createNetworkError(timedOut) {
  const error = new Error(
    timedOut
      ? 'The connection is too slow right now. Please try again.'
      : 'You appear to be offline. Please check your connection.'
  );
  error.isNetworkError = true;
  error.timedOut = Boolean(timedOut);
  return error;
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw createNetworkError(err && err.name === 'AbortError');
  } finally {
    clearTimeout(timer);
  }
}

async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      lastRefreshFailure = 'rejected';
      return null;
    }

    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        },
        DEFAULT_TIMEOUT_MS
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        lastRefreshFailure = res.status >= 500 ? 'network' : 'rejected';
        return null;
      }

      lastRefreshFailure = null;
      accessToken = body.data.accessToken;
      localStorage.setItem(REFRESH_KEY, body.data.refreshToken);
      return { accessToken: body.data.accessToken, refreshToken: body.data.refreshToken };
    } catch {
      lastRefreshFailure = 'network';
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function perform(path, config) {
  const headers = { ...(config.headers || {}) };
  const hasBody = config.body !== undefined && config.body !== null;
  if (!config.isForm && hasBody) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetchWithTimeout(
    `${API_BASE_URL}${path}`,
    {
      method: config.method,
      headers,
      body: hasBody ? (config.isForm ? config.body : JSON.stringify(config.body)) : undefined,
    },
    config.timeoutMs
  );

  if (res.status === 401 && config.retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return perform(path, { ...config, retry: false });
    }
    if (lastRefreshFailure === 'network') {
      throw createNetworkError(false);
    }
    if (onUnauthorized) onUnauthorized();
  }

  const data = config.parseJson
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => '');

  if (!res.ok) {
    const error = new Error((data && data.message) || 'Something went wrong');
    error.statusCode = res.status;
    if (data && data.code) error.code = data.code;
    throw error;
  }
  return data;
}

function isCacheable(path, config) {
  return (
    config.method === 'GET' &&
    config.parseJson &&
    config.cache !== false &&
    !NO_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function recordOutcome(err) {
  if (!err) {
    reportRequestSuccess();
    return;
  }
  if (err.isNetworkError || [502, 503, 504].includes(err.statusCode)) {
    reportRequestFailure();
    return;
  }
  reportRequestSuccess();
}

function shouldServeCache(err) {
  return err.isNetworkError || [502, 503, 504].includes(err.statusCode);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cachedGet(path, config) {
  const userId = currentUserId;
  const stored = userId ? await cacheGet(userId, path).catch(() => null) : null;

  if (stored && getNetworkSnapshot().status === 'offline') {
    return stored.data;
  }

  const network = perform(path, config).then(
    (data) => {
      recordOutcome(null);
      if (userId) cachePut(userId, path, data).catch(() => {});
      return { data };
    },
    (err) => {
      recordOutcome(err);
      return { err };
    }
  );

  if (!stored) {
    const outcome = await network;
    if (outcome.err) throw outcome.err;
    return outcome.data;
  }

  const outcome = await Promise.race([network, delay(SOFT_CACHE_TIMEOUT_MS).then(() => null)]);

  if (outcome === null) return stored.data;
  if (outcome.err) {
    if (shouldServeCache(outcome.err)) return stored.data;
    throw outcome.err;
  }
  return outcome.data;
}

async function request(
  path,
  {
    method = 'GET',
    body,
    isForm = false,
    retry = true,
    parseJson = true,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache,
  } = {}
) {
  const config = { method, body, isForm, retry, parseJson, headers, timeoutMs, cache };

  if (isCacheable(path, config)) {
    return cachedGet(path, config);
  }

  try {
    const data = await perform(path, config);
    recordOutcome(null);
    return data;
  } catch (err) {
    recordOutcome(err);
    throw err;
  }
}

export { request, tryRefresh, setAccessToken, setUnauthorizedHandler, setCurrentUserId, getRefreshFailure };
