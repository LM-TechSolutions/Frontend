import { API } from './config';

const TOKEN_KEY = 'tokuma.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(base: string, path: string, query?: RequestOptions['query']) {
  let url = `${base}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function request<T>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(base, path, options.query), {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include', // send the session cookie (same-origin via proxy)
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: any = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message = payload?.error?.message || payload?.message || `Request failed (${res.status})`;
    if (res.status === 401) setToken(null);
    throw new ApiError(message, res.status, payload?.error?.code);
  }

  // Backend wraps responses as { success, data, ... }
  return (payload?.data !== undefined ? payload.data : payload) as T;
}

const cc = <T>(path: string, options?: RequestOptions) => request<T>(API.cc, path, options);
const v1 = <T>(path: string, options?: RequestOptions) => request<T>(API.v1, path, options);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'driver' | 'user' | string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

// ---- Centralized API surface ----
export const api = {
  auth: {
    login: (email: string, password: string, code?: string) =>
      cc<{ token?: string; user?: AuthUser; twoFactorRequired?: boolean }>('/auth/login', {
        method: 'POST',
        body: code ? { email, password, code } : { email, password },
      }),
    logout: () => cc<null>('/auth/logout', { method: 'POST' }).catch(() => null),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
      cc<null>('/settings/password', { method: 'POST', body: { currentPassword, newPassword, confirmPassword } }),
  },

  twoFactor: {
    enable: (password: string) =>
      v1<{ totpURI: string; backupCodes: string[]; qrCodeDataUrl: string | null }>('/auth/two-factor/enable', {
        method: 'POST',
        body: { password },
      }),
    verify: (code: string) => v1<{ verified: boolean }>('/auth/two-factor/verify', { method: 'POST', body: { code } }),
    disable: (password: string) => v1<null>('/auth/two-factor/disable', { method: 'POST', body: { password } }),
  },

  dashboard: {
    stats: (period = 'today') => cc<any>('/analytics/dashboard', { query: { period } }),
    performance: () => cc<any>('/analytics/performance'),
    revenue: (query?: Record<string, string>) => cc<any>('/analytics/revenue', { query }),
  },

  rides: {
    list: (query?: Record<string, any>) => cc<{ rides: any[]; pagination: any }>('/rides', { query }),
    get: (rideId: string) => cc<any>(`/rides/${rideId}`),
    create: (body: any) => cc<any>('/rides', { method: 'POST', body }),
    update: (rideId: string, body: any) => cc<any>(`/rides/${rideId}`, { method: 'PATCH', body }),
    assign: (rideId: string, driverId: string) =>
      cc<any>(`/rides/${rideId}/assign`, { method: 'POST', body: { driverId } }),
    cancel: (rideId: string, reason: string) =>
      cc<any>(`/rides/${rideId}/cancel`, { method: 'POST', body: { reason } }),
    redispatch: (rideId: string) =>
      cc<{ rideId: string; dispatched: boolean; candidates: number }>(`/rides/${rideId}/redispatch`, { method: 'POST' }),
    location: (rideId: string) => cc<any>(`/rides/${rideId}/location`),
    history: (rideId: string) => v1<any>(`/rides/${rideId}/history`),
  },

  drivers: {
    list: (query?: Record<string, any>) => cc<{ drivers: any[]; pagination: any }>('/drivers', { query }),
    get: (driverId: string) => cc<any>(`/drivers/${driverId}`),
    create: (body: any) => cc<any>('/drivers', { method: 'POST', body }),
    update: (driverId: string, body: any) => cc<any>(`/drivers/${driverId}`, { method: 'PATCH', body }),
    remove: (driverId: string) => cc<any>(`/drivers/${driverId}`, { method: 'DELETE' }),
    locationHistory: (driverId: string) => cc<any>(`/drivers/${driverId}/location-history`),
  },

  coupons: {
    list: (query?: Record<string, any>) => cc<any>('/coupons', { query }),
    balance: (driverId: string) => cc<any>(`/coupons/balance/${driverId}`),
    refill: (driverId: string, amount: number, notes?: string) =>
      cc<any>('/coupons/refill', { method: 'POST', body: { driverId, amount, notes } }),
    deduct: (driverId: string, amount: number, notes?: string) =>
      cc<any>('/coupons/deduct', { method: 'POST', body: { driverId, amount, notes } }),
  },

  operators: {
    list: (query?: Record<string, any>) => cc<any>('/operators', { query }),
    create: (body: any) => cc<any>('/operators', { method: 'POST', body }),
    update: (id: string, body: any) => cc<any>(`/operators/${id}`, { method: 'PATCH', body }),
    remove: (id: string) => cc<any>(`/operators/${id}`, { method: 'DELETE' }),
  },

  callLogs: {
    list: (query?: Record<string, any>) => cc<any>('/call-logs', { query }),
    create: (body: any) => cc<any>('/call-logs', { method: 'POST', body }),
  },

  settings: {
    getSystem: () => v1<any[]>('/admin/settings'),
    updateSystem: (settings: Record<string, string>) =>
      v1<any>('/admin/settings', { method: 'PUT', body: settings }),
  },

  map: {
    geocode: (address: string) => v1<any>('/map/geocode', { method: 'POST', body: { address } }),
    reverseGeocode: (latitude: number, longitude: number) =>
      v1<any>('/map/reverse-geocode', { method: 'POST', body: { latitude, longitude } }),
    search: (query: string, limit = 6) =>
      v1<Array<{ name: string; formattedAddress: string; latitude: number; longitude: number }>>('/map/search', {
        query: { query, limit },
      }),
    searchLandmarks: (query: string, latitude?: number, longitude?: number) =>
      v1<any[]>('/map/search-landmarks', { method: 'POST', body: { query, latitude, longitude } }),
    route: (startLat: number, startLng: number, endLat: number, endLng: number) =>
      v1<any>('/map/route', { query: { startLat, startLng, endLat, endLng } }),
    nearbyDrivers: (latitude: number, longitude: number, radiusKm = 5) =>
      v1<any[]>('/map/nearby-drivers', { method: 'POST', body: { latitude, longitude, radiusKm } }),
  },
};
