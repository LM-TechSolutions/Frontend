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

// ---- Coupon hierarchy ----------------------------------------------------

export interface OperatorWallet {
  id: string;
  operatorId: string;
  operator?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    shift?: string | null;
    user?: { email: string; phoneNumber: string | null; isActive: boolean };
  };
  balance: number;
  lowBalanceThreshold: number;
  totalAllocated: number;
  totalSold: number;
  isLowBalance: boolean;
  updatedAt: string;
}

export interface CouponPackage {
  id: string;
  name: string;
  couponCount: number;
  price: number | null;
  description: string | null;
  isActive: boolean;
}

export interface CouponRequest {
  id: string;
  requesterType: 'driver' | 'operator';
  driverId: string | null;
  operatorId: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
  autoCreated: boolean;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    vehiclePlate: string;
    vehicleType: string;
    couponWallet?: { balance: number } | null;
    user?: { phoneNumber: string | null; email: string };
  } | null;
  operator?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    couponWallet?: { balance: number } | null;
    user?: { phoneNumber: string | null; email: string };
  } | null;
}

export interface AssignmentCandidate {
  driverId: string;
  name: string;
  phoneNumber: string | null;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string | null;
  rating: number;
  totalRides: number;
  couponBalance: number;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  isEligible: boolean;
  blockedReason: string | null;
}

export interface NearbyDriversResponse {
  rideId: string;
  pickup: { latitude: number; longitude: number; address: string };
  dropoff: { latitude: number; longitude: number; address: string };
  assignedDriverId: string | null;
  minCouponBalance: number;
  eligibleCount: number;
  candidates: AssignmentCandidate[];
}

export interface MyPermissions {
  userId: string;
  role: string;
  actorType: 'super_admin' | 'admin' | 'operator' | 'driver' | 'user';
  isSuperAdmin: boolean;
  isAdmin: boolean;
  operatorId: string | null;
  roles: string[];
  permissions: string[];
}

export interface AdminAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface DriverPerformanceReport {
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    totalRides: number;
    vehiclePlate: string;
    vehicleType: string;
    commissionPercent: number;
    couponWallet?: { balance: number } | null;
  } | null;
  range: { startDate: string; endDate: string };
  summary: {
    completedRides: number;
    cancelledRides: number;
    offeredRides: number;
    acceptedRides: number;
    acceptanceRate: number | null;
    totalFare: number;
    totalEarnings: number;
    totalCommission: number;
    couponsDeducted: number;
    couponsRefunded: number;
    netCouponsSpent: number;
    distanceKm: number;
    drivingHours: number;
    onlineHours: number;
    averageCustomerRating: number | null;
    currentRating: number | null;
    currentCouponBalance: number;
  };
  dailySeries: Array<{ date: string; rides: number; fare: number; earnings: number }>;
  rides: Array<{
    id: string;
    status: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    fare: number | null;
    driverEarnings: number | null;
    commissionAmount: number | null;
    distance: number | null;
    duration: number | null;
    currency: string | null;
    createdAt: string;
    completedAt: string | null;
    cancelledAt: string | null;
    customerRating: number | null;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
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
    /** Nearest assignable drivers for this ride, ranked by distance from pickup. */
    nearbyDrivers: (rideId: string) => v1<NearbyDriversResponse>(`/rides/${rideId}/nearby-drivers`),
  },

  drivers: {
    list: (query?: Record<string, any>) => cc<{ drivers: any[]; pagination: any }>('/drivers', { query }),
    get: (driverId: string) => cc<any>(`/drivers/${driverId}`),
    create: (body: any) => cc<any>('/drivers', { method: 'POST', body }),
    update: (driverId: string, body: any) => cc<any>(`/drivers/${driverId}`, { method: 'PATCH', body }),
    remove: (driverId: string) => cc<any>(`/drivers/${driverId}`, { method: 'DELETE' }),
    locationHistory: (driverId: string) => cc<any>(`/drivers/${driverId}/location-history`),
    /** Activity report for a custom date range (inclusive of both days). */
    performance: (driverId: string, query: { startDate?: string; endDate?: string; page?: number; limit?: number }) =>
      v1<DriverPerformanceReport>(`/drivers/${driverId}/performance`, { query }),
  },

  coupons: {
    list: (query?: Record<string, any>) => cc<any>('/coupons', { query }),
    balance: (driverId: string) => cc<any>(`/coupons/balance/${driverId}`),
    /**
     * Refill a driver. An operator's refill debits their own inventory and is
     * rejected when they are out of stock; an admin mints directly.
     */
    refill: (driverId: string, amount: number, notes?: string) =>
      cc<any>('/coupons/refill', { method: 'POST', body: { driverId, amount, notes } }),
    deduct: (driverId: string, amount: number, notes?: string) =>
      cc<any>('/coupons/deduct', { method: 'POST', body: { driverId, amount, notes } }),
    transactions: (driverId: string, limit = 50) =>
      v1<any[]>(`/coupons/${driverId}/transactions`, { query: { limit } }),
  },

  /** Operator coupon inventory — the middle tier of the distribution hierarchy. */
  operatorCoupons: {
    listWallets: () => cc<{ wallets: OperatorWallet[] }>('/operator-coupons'),
    wallet: (operatorId = 'me') => cc<OperatorWallet>(`/operator-coupons/${operatorId}`),
    transactions: (operatorId = 'me', limit = 50) =>
      cc<{ transactions: any[] }>(`/operator-coupons/${operatorId}/transactions`, { query: { limit } }),
    allocate: (operatorId: string, body: { packageId?: string; amount?: number; reason?: string }) =>
      cc<any>(`/operator-coupons/${operatorId}/allocate`, { method: 'POST', body }),
    adjust: (operatorId: string, amount: number, reason: string) =>
      cc<any>(`/operator-coupons/${operatorId}/adjust`, { method: 'POST', body: { amount, reason } }),
    /** Transfer coupons into a driver's wallet. */
    sell: (body: { driverId: string; amount: number; reason?: string; operatorId?: string }) =>
      cc<any>('/coupon-sales', { method: 'POST', body }),
  },

  couponPackages: {
    list: (includeInactive = false) =>
      cc<{ packages: CouponPackage[] }>('/coupon-packages', { query: { includeInactive } }),
    create: (body: { name: string; couponCount: number; price?: number; description?: string }) =>
      cc<CouponPackage>('/coupon-packages', { method: 'POST', body }),
    update: (packageId: string, body: Partial<CouponPackage>) =>
      cc<CouponPackage>(`/coupon-packages/${packageId}`, { method: 'PATCH', body }),
  },

  couponRequests: {
    list: (query?: { status?: string; requesterType?: string; limit?: number }) =>
      cc<{ requests: CouponRequest[]; pendingCount: number }>('/coupon-requests', { query }),
    mine: () => cc<{ requests: CouponRequest[] }>('/coupon-requests/mine'),
    create: (body: { amount: number; note?: string; operatorId?: string }) =>
      cc<CouponRequest>('/coupon-requests', { method: 'POST', body }),
    approve: (requestId: string, body?: { amount?: number; resolutionNote?: string; operatorId?: string; packageId?: string }) =>
      cc<CouponRequest>(`/coupon-requests/${requestId}/approve`, { method: 'POST', body: body ?? {} }),
    reject: (requestId: string, resolutionNote?: string) =>
      cc<CouponRequest>(`/coupon-requests/${requestId}/reject`, { method: 'POST', body: { resolutionNote } }),
    cancel: (requestId: string) =>
      cc<CouponRequest>(`/coupon-requests/${requestId}/cancel`, { method: 'POST' }),
  },

  /** Administrator accounts, permission sets, and the Super Admin role. */
  admins: {
    myPermissions: () => cc<MyPermissions>('/me/permissions'),
    catalog: () =>
      cc<{
        permissions: Array<{ key: string; resource: string; action: string; description: string }>;
        roles: Array<{ name: string; description: string | null; permissions: string[] }>;
        presets: Array<{ name: string; description: string; permissions: string[] }>;
      }>('/permission-catalog'),
    list: () => cc<{ admins: AdminAccount[] }>('/admins'),
    create: (body: { name: string; email: string; password: string; phone?: string; department?: string; roles?: string[] }) =>
      cc<AdminAccount>('/admins', { method: 'POST', body }),
    update: (adminId: string, body: { name?: string; phone?: string; department?: string; isActive?: boolean }) =>
      cc<AdminAccount>(`/admins/${adminId}`, { method: 'PATCH', body }),
    setRoles: (adminId: string, roles: string[]) =>
      cc<AdminAccount>(`/admins/${adminId}/permissions`, { method: 'PUT', body: { roles } }),
    transferSuperAdmin: (adminId: string) =>
      cc<AdminAccount>(`/admins/${adminId}/transfer-super-admin`, { method: 'POST' }),
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
