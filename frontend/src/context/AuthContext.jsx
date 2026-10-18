import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as authApi from '../api/auth.api';
import { REFRESH_KEY } from '../api/config';
import {
  setAccessToken,
  setCurrentUserId,
  setUnauthorizedHandler,
  tryRefresh,
} from '../api/httpClient';
import { saveSession, getSession, clearSession as clearCachedSession } from '../offline/db';
import { cacheClearUser } from '../offline/cache';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('attachtrack_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const manualAuthRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    userIdRef.current = user ? user.id : null;
    setCurrentUserId(user ? user.id : null);
  }, [user]);

  const clearSession = useCallback(() => {
    const previousUserId = userIdRef.current;
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('attachtrack_user');
    clearCachedSession().catch(() => {});
    if (previousUserId) cacheClearUser(previousUserId).catch(() => {});
    setCurrentUserId(null);
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

    getSession()
      .then((cached) => {
        if (manualAuthRef.current || !cached) return;
        setUser(cached.user);
        setStatus('authenticated');
      })
      .catch(() => {});

    const fallbackUser = readStoredUser();
    if (fallbackUser) {
      setUser((current) => current || fallbackUser);
      setStatus((current) => (current === 'loading' ? 'authenticated' : current));
    }

    tryRefresh()
      .then((result) => {
        if (manualAuthRef.current) return;
        if (!result) return;

        const resolvedUser = readStoredUser();
        setUser(resolvedUser);
        setStatus('authenticated');
        saveSession({ refreshToken: result.refreshToken, user: resolvedUser }).catch(() => {});
      })
      .catch(() => {});
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    manualAuthRef.current = true;
    const res = await authApi.login({ email, password });
    setAccessToken(res.data.accessToken);
    setCurrentUserId(res.data.user.id);
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
      manualAuthRef.current = false;
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
