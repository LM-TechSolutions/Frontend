import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, AuthUser, MyPermissions, setToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { getDeviceId, getDeviceName } from '../lib/device';

const USER_KEY = 'tokuma.user';
const IDLE_KEY = 'tokuma.idleTimeoutMinutes';

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

export type LoginResult =
  | { twoFactorRequired: true }
  | { twoFactorRequired: false; user: AuthUser; twoFactorEnrollmentRequired: boolean };

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
  idleTimeoutMinutes: number;
  needsTwoFactorEnrollment: boolean;
  /** Gate UI on a capability rather than a role: `can('coupons', 'allocate')`. */
  can: (resource: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
  login: (
    email: string,
    password: string,
    code?: string,
    options?: { rememberDevice?: boolean }
  ) => Promise<LoginResult>;
  completeTwoFactorEnrollment: () => void;
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

function persistUser(user: AuthUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [capabilities, setCapabilities] = useState<MyPermissions | null>(null);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(() => {
    const stored = Number(localStorage.getItem(IDLE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 15;
  });

  const refreshPermissions = useCallback(async () => {
    try {
      setCapabilities(await api.admins.myPermissions());
    } catch {
      setCapabilities(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredUser();

    const hydrate = async () => {
      if (!stored || !toDashboardRole(stored.role)) {
        if (stored) {
          setToken(null);
          persistUser(null);
        }
        if (!cancelled) setIsReady(true);
        return;
      }

      try {
        const session = await api.auth.me();
        if (cancelled) return;
        if (session.token) setToken(session.token);
        const nextUser: AuthUser = {
          ...session.user,
          twoFactorEnrollmentRequired: !!(
            session.twoFactorEnrollmentRequired || session.user.twoFactorEnrollmentRequired
          ),
        };
        persistUser(nextUser);
        setUser(nextUser);
        if (session.idleTimeoutMinutes) {
          setIdleTimeoutMinutes(session.idleTimeoutMinutes);
          localStorage.setItem(IDLE_KEY, String(session.idleTimeoutMinutes));
        }
        connectSocket();
        await refreshPermissions();
      } catch {
        if (cancelled) return;
        setToken(null);
        persistUser(null);
        setUser(null);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshPermissions]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      code?: string,
      options?: { rememberDevice?: boolean }
    ): Promise<LoginResult> => {
      const result = await api.auth.login(email, password, code, {
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        rememberDevice: !!options?.rememberDevice,
      });
      if (result.twoFactorRequired || !result.user) {
        return { twoFactorRequired: true };
      }
      const sessionToken = result.token || (result as { session?: { token?: string } }).session?.token;
      if (sessionToken) setToken(sessionToken);
      const enrollment = !!(result.twoFactorEnrollmentRequired || result.user.twoFactorEnrollmentRequired);
      const nextUser: AuthUser = {
        ...result.user,
        twoFactorEnrollmentRequired: enrollment,
      };
      persistUser(nextUser);
      setUser(nextUser);
      if (result.idleTimeoutMinutes) {
        setIdleTimeoutMinutes(result.idleTimeoutMinutes);
        localStorage.setItem(IDLE_KEY, String(result.idleTimeoutMinutes));
      }
      connectSocket();
      await refreshPermissions();
      return { twoFactorRequired: false, user: nextUser, twoFactorEnrollmentRequired: enrollment };
    },
    [refreshPermissions]
  );

  useEffect(() => {
    const onUnauthorized = () => {
      disconnectSocket();
      setToken(null);
      persistUser(null);
      setUser(null);
      setCapabilities(null);
    };
    window.addEventListener('tokuma:unauthorized', onUnauthorized);
    return () => window.removeEventListener('tokuma:unauthorized', onUnauthorized);
  }, []);

  const completeTwoFactorEnrollment = useCallback(() => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, twoFactorEnabled: true, twoFactorEnrollmentRequired: false };
      persistUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    disconnectSocket();
    setToken(null);
    persistUser(null);
    setUser(null);
    setCapabilities(null);
  }, []);

  const dashboardRole = toDashboardRole(user?.role);
  const needsTwoFactorEnrollment = !!(user?.twoFactorEnrollmentRequired && !user.twoFactorEnabled);

  const can = useCallback(
    (resource: string, action: string) => {
      if (capabilities?.isSuperAdmin) return true;
      if (capabilities?.permissions?.length) {
        return capabilities.permissions.includes(`${resource}:${action}`);
      }
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
      idleTimeoutMinutes,
      needsTwoFactorEnrollment,
      can,
      refreshPermissions,
      login,
      completeTwoFactorEnrollment,
      logout,
    }),
    [
      user,
      dashboardRole,
      isReady,
      capabilities,
      idleTimeoutMinutes,
      needsTwoFactorEnrollment,
      can,
      refreshPermissions,
      login,
      completeTwoFactorEnrollment,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
