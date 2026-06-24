import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, AuthUser, setToken, getToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const USER_KEY = 'tokuma.user';

/** Normalize backend roles to the two dashboard personas. */
export type DashboardRole = 'admin' | 'operator';
export function toDashboardRole(role?: string): DashboardRole {
  return role === 'admin' ? 'admin' : 'operator';
}

interface AuthContextValue {
  user: AuthUser | null;
  role: DashboardRole;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Restore session on first load.
  useEffect(() => {
    const stored = loadStoredUser();
    if (stored && getToken()) {
      setUser(stored);
      connectSocket();
    }
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedIn } = await api.auth.login(email, password);
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedIn));
    setUser(loggedIn);
    connectSocket();
    return loggedIn;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    disconnectSocket();
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: toDashboardRole(user?.role),
      isAuthenticated: !!user,
      isReady,
      login,
      logout,
    }),
    [user, isReady, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
