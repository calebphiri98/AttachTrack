import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/auth.api';
import { setAccessToken, setUnauthorizedHandler, request } from '../api/httpClient';

const REFRESH_KEY = 'attachtrack_refresh_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const clearSession = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  // On first load, if a refresh token is cached, try to silently restore
  // the session — this is the "cached login" behavior the spec calls for
  // (full offline persistence via IndexedDB comes later, in Phase 6; this
  // localStorage-backed version is the online-first stand-in for now).
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
    if (!storedRefreshToken) {
      setStatus('guest');
      return;
    }

    request('/auth/refresh', { method: 'POST', body: { refreshToken: storedRefreshToken } })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
        // The refresh endpoint doesn't return the user profile, so we
        // decode just enough from the token payload isn't safe/portable —
        // instead we mark authenticated and let ProtectedRoute's role
        // check happen once a role-aware call (e.g. /students/me) resolves,
        // OR simplest: re-derive role from a lightweight call. For now we
        // store role/name from the last login in localStorage alongside
        // the refresh token, purely for restoring the UI without a login.
        const cachedUser = localStorage.getItem('attachtrack_user');
        setUser(cachedUser ? JSON.parse(cachedUser) : null);
        setStatus('authenticated');
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
    localStorage.setItem('attachtrack_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setStatus('authenticated');
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
      await authApi.logout({ refreshToken });
    } catch {
      // Even if the server call fails (e.g. offline), clear the local
      // session anyway — the person clicked logout, honor it locally.
    }
    clearSession();
  }, [clearSession]);

  const value = { user, status, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
