import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, AuthUser, MyPermissions, setToken, getToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const USER_KEY = 'tokuma.user';

/**
 * Normalize backend roles to the two dashboard personas - null for anything
 * else. The backend now refuses to issue a dashboard token to non-staff
 * accounts at all, but this stays strict rather than defaulting an unknown
 * role to 'operator', so a stale/tampered stored session can't grant access.
 */
export type DashboardRole = 'admin' | 'operator';
export function toDashboardRole(role?: string): DashboardRole | null {
  if (role === 'admin' || role === 'super-admin') return 'admin';
  if (role === 'agent') return 'operator';
  return null;
}

export type LoginResult = { twoFactorRequired: true } | { twoFactorRequired: false; user: AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  role: DashboardRole | null;
  isAuthenticated: boolean;
  isReady: boolean;
  /** Effective capabilities from the server, e.g. `coupons:allocate`. */
  permissions: string[];
  isSuperAdmin: boolean;
  /** This account's AgentProfile id, when they are a call-centre operator. */
  operatorId: string | null;
  /** Gate UI on a capability rather than a role: `can('coupons', 'allocate')`. */
  can: (resource: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
  login: (email: string, password: string, code?: string) => Promise<LoginResult>;
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
  const [capabilities, setCapabilities] = useState<MyPermissions | null>(null);

  const refreshPermissions = useCallback(async () => {
    try {
      setCapabilities(await api.admins.myPermissions());
    } catch {
      // Permissions are an enhancement over the role check, never a gate on
      // rendering — an older backend simply leaves the UI role-driven.
      setCapabilities(null);
    }
  }, []);

  // Restore session on first load.
  useEffect(() => {
    const stored = loadStoredUser();
    if (stored && getToken() && toDashboardRole(stored.role)) {
      setUser(stored);
      connectSocket();
      refreshPermissions();
    } else if (stored) {
      // A stored session with a role that no longer qualifies (e.g. saved
      // before the server-side restriction existed) - discard it rather
      // than granting dashboard access on a stale, invalid persona.
      setToken(null);
      localStorage.removeItem(USER_KEY);
    }
    setIsReady(true);
  }, [refreshPermissions]);

  const login = useCallback(
    async (email: string, password: string, code?: string): Promise<LoginResult> => {
      const result = await api.auth.login(email, password, code);
      if (result.twoFactorRequired || !result.token || !result.user) {
        return { twoFactorRequired: true };
      }
      setToken(result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setUser(result.user);
      connectSocket();
      await refreshPermissions();
      return { twoFactorRequired: false, user: result.user };
    },
    [refreshPermissions]
  );

  const logout = useCallback(() => {
    api.auth.logout();
    disconnectSocket();
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setCapabilities(null);
  }, []);

  const dashboardRole = toDashboardRole(user?.role);

  const can = useCallback(
    (resource: string, action: string) => {
      if (capabilities?.isSuperAdmin) return true;
      if (capabilities?.permissions?.length) {
        return capabilities.permissions.includes(`${resource}:${action}`);
      }
      // No permission data yet (still loading, or an older backend): fall back
      // to the role personas the dashboard has always used.
      return dashboardRole === 'admin';
    },
    [capabilities, dashboardRole]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: dashboardRole,
      isAuthenticated: !!user && !!dashboardRole,
      isReady,
      permissions: capabilities?.permissions ?? [],
      isSuperAdmin: capabilities?.isSuperAdmin ?? false,
      operatorId: capabilities?.operatorId ?? null,
      can,
      refreshPermissions,
      login,
      logout,
    }),
    [user, dashboardRole, isReady, capabilities, can, refreshPermissions, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
