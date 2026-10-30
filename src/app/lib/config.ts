/** Centralized runtime config sourced from Vite env vars. */
export const config = {
  // Empty => same-origin (requests go through the Vite proxy to the backend).
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '',
  gebetaApiKey: import.meta.env.VITE_GEBETA_API_KEY ?? '',
};

// Backend route prefixes.
export const API = {
  /** Call-center / frontend-compatible contract (operators, drivers, coupons, analytics). */
  cc: `${config.apiBaseUrl}/v1`,
  /** Versioned API (rides lifecycle, map, admin settings, gps). */
  v1: `${config.apiBaseUrl}/api/v1`,
};

// Addis Ababa default map center [lng, lat] (Gebeta uses lng-first).
export const ADDIS_CENTER: [number, number] = [38.7578, 8.9806];

/**
 * Resolves media URLs (driver photos, avatars) so relative paths like
 * `/v1/uploads/drivers/...` point to the backend host in production.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  const base =
    config.apiBaseUrl ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://backend-api.tokuma.et'
      : '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${cleanPath}`;
}

