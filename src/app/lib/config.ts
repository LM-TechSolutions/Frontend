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
