const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// The access token lives in memory only (set by AuthContext after
// login/refresh). It intentionally does NOT persist to localStorage —
// only the refresh token does (see AuthContext) — so a stolen localStorage
// dump can't be used directly as a live access token.
let accessToken = null;
let onUnauthorized = null; // called when refresh also fails — AuthContext wires this to "log the user out"

function setAccessToken(token) {
  accessToken = token;
}

function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('attachtrack_refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) return false;

    accessToken = body.data.accessToken;
    localStorage.setItem('attachtrack_refresh_token', body.data.refreshToken);
    return true;
  } catch {
    return false;
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

export { request, setAccessToken, setUnauthorizedHandler };
