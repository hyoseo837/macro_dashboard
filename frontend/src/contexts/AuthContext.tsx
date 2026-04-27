import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import * as authApi from '../api/auth';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshingRef = useRef<Promise<string> | null>(null);

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
  }, []);

  // Axios request interceptor: attach token
  useEffect(() => {
    const reqId = apiClient.interceptors.request.use((config) => {
      if (tokenRef.current) {
        config.headers.Authorization = `Bearer ${tokenRef.current}`;
      }
      return config;
    });

    // Axios response interceptor: refresh on 401
    const resId = apiClient.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
          original._retry = true;
          try {
            if (!refreshingRef.current) {
              refreshingRef.current = authApi.refreshToken().then((res) => {
                setToken(res.access_token);
                refreshingRef.current = null;
                return res.access_token;
              });
            }
            const newToken = await refreshingRef.current;
            original.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(original);
          } catch {
            refreshingRef.current = null;
            setToken(null);
            setUser(null);
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.request.eject(reqId);
      apiClient.interceptors.response.eject(resId);
    };
  }, [setToken]);

  // On mount: try to refresh (cookie may exist)
  useEffect(() => {
    authApi.refreshToken()
      .then((res) => {
        setToken(res.access_token);
        return authApi.getMe();
      })
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [setToken]);

  const loginFn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setToken(res.access_token);
    const me = await authApi.getMe();
    setUser(me);
  }, [setToken]);

  const registerFn = useCallback(async (payload: authApi.RegisterPayload) => {
    const res = await authApi.register(payload);
    setToken(res.access_token);
    const me = await authApi.getMe();
    setUser(me);
  }, [setToken]);

  const logoutFn = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }, [setToken]);

  return (
    <AuthContext.Provider value={{ user, loading, login: loginFn, register: registerFn, logout: logoutFn }}>
      {children}
    </AuthContext.Provider>
  );
}
