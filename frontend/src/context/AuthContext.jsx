import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as authApi from '../api/auth.api';
import { setAccessToken, setUnauthorizedHandler, tryRefresh } from '../api/httpClient';
import { saveSession, getSession, clearSession as clearCachedSession } from '../offline/db';

const REFRESH_KEY = 'attachtrack_refresh_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const manualAuthRef = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('attachtrack_user');
    clearCachedSession().catch(() => {});
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
    if (!storedRefreshToken) {
      setStatus('guest');
      return;
    }

    // Optimistic restore: read the IndexedDB-cached session immediately.
    // This is what makes an offline reload show a logged-in UI instead of
    // bouncing to /login — it doesn't wait on, or require, the network call.
    getSession()
      .then((cached) => {
        if (manualAuthRef.current || !cached) return;
        setUser(cached.user);
        setStatus('authenticated');
      })
      .catch(() => {
        // no cached session yet — fine, the refresh call below is the fallback
      });

    // Uses the SAME shared tryRefresh() as httpClient.js's own 401-retry
    // logic — this is what a rotating refresh token requires. Two
    // independent refresh calls racing each other (this effect firing at
    // the same time as some other request's 401-triggered retry) would
    // otherwise have the second one arrive with an already-consumed token
    // and get wrongly rejected, incorrectly logging the user out.
    tryRefresh()
      .then((result) => {
        if (manualAuthRef.current) return;
        if (!result) return; // network failure or expired token — see below

        const cachedUser = localStorage.getItem('attachtrack_user');
        const resolvedUser = cachedUser ? JSON.parse(cachedUser) : null;
        setUser(resolvedUser);
        setStatus('authenticated');
        // Keep the IndexedDB copy fresh with the latest confirmed session.
        saveSession({ refreshToken: result.refreshToken, user: resolvedUser }).catch(() => {});
      })
      .catch(() => {
        // tryRefresh() itself never throws (it catches internally and
        // resolves null), so this is defensive only.
      });
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    manualAuthRef.current = true;
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
    localStorage.setItem('attachtrack_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setStatus('authenticated');
    saveSession({ refreshToken: res.data.refreshToken, user: res.data.user }).catch(() => {});
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
    manualAuthRef.current = false;
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