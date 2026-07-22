const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// The access token lives in memory only (set by AuthContext after
// login/refresh). It intentionally does NOT persist to localStorage —
// only the refresh token does (see AuthContext) — so a stolen localStorage
// dump can't be used directly as a live access token.
let accessToken = null;
let onUnauthorized = null; // called when refresh also fails — AuthContext wires this to "log the user out"

// Refresh tokens rotate (single-use) — if two callers try to refresh at the
// same time (e.g. AuthContext's session-restore on load, and a 401-retry
// from an unrelated request racing it), the second one to reach the server
// would send an already-consumed token and get rejected, incorrectly
// logging the user out. This shared in-flight promise ensures only one
// real refresh request is ever in the air at a time — every concurrent
// caller awaits the same result instead of racing.
let refreshPromise = null;

function setAccessToken(token) {
  accessToken = token;
}

function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Returns { accessToken, refreshToken } on success, or null on failure.
// Safe to call concurrently from multiple places — all callers share one
// underlying request.
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('attachtrack_refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) return null;

      accessToken = body.data.accessToken;
      localStorage.setItem('attachtrack_refresh_token', body.data.refreshToken);
      return { accessToken: body.data.accessToken, refreshToken: body.data.refreshToken };
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// options.isForm: pass a FormData body (for file uploads) instead of JSON.
async function request(path, { method = 'GET', body, isForm = false, retry = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  // Access token expired mid-session — try one silent refresh, then replay
  // the original request exactly once before giving up.
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, { method, body, isForm, retry: false });
    }
    if (onUnauthorized) onUnauthorized();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.statusCode = res.status;
    throw error;
  }
  return data;
}

export { request, tryRefresh, setAccessToken, setUnauthorizedHandler };