import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as authApi from '../api/auth.api';
import { setAccessToken, setUnauthorizedHandler, request } from '../api/httpClient';

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

    request('/auth/refresh', { method: 'POST', body: { refreshToken: storedRefreshToken } })
      .then((res) => {
        if (manualAuthRef.current) return;
        setAccessToken(res.data.accessToken);
        localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
        const cachedUser = localStorage.getItem('attachtrack_user');
        setUser(cachedUser ? JSON.parse(cachedUser) : null);
        setStatus('authenticated');
      })
      .catch(() => {
        if (manualAuthRef.current) return;
        clearSession();
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