import { api } from './api';

export interface RoadRoute {
  /** MapLibre path as [lng, lat] pairs. */
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  polyline?: string;
  provider?: string;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function alignLngLat(
  coords: [number, number][],
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): [number, number][] {
  if (coords.length < 2) return coords;
  const score = (pts: [number, number][]) =>
    haversineMeters(pts[0][1], pts[0][0], startLat, startLng) +
    haversineMeters(pts[pts.length - 1][1], pts[pts.length - 1][0], endLat, endLng);
  const swapped = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  return score(swapped) < score(coords) ? swapped : coords;
}

function asLngLatPairs(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const coords: [number, number][] = [];
  for (const c of raw) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    coords.push([lng, lat]);
  }
  return coords.length >= 2 ? coords : null;
}

/** Decode a Google-encoded polyline into [lng, lat] pairs for MapLibre. */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

/**
 * Road-accurate route via backend `/map/route` (Gebeta with OSM road geometry).
 */
export async function fetchRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RoadRoute> {
  const data = await api.map.route(startLat, startLng, endLat, endLng);
  const distanceMeters = Number(data?.distance ?? 0);
  const durationSeconds = Number(data?.duration ?? 0);
  const polyline = data?.polyline ? String(data.polyline) : undefined;

  const fromCoords =
    asLngLatPairs(data?.coordinates) ??
    asLngLatPairs(data?.geometry?.coordinates) ??
    (polyline && polyline.length > 0 ? decodePolyline(polyline) : null);

  if (!fromCoords) {
    throw new Error('Map route returned no road geometry');
  }

  const coords = alignLngLat(fromCoords, startLat, startLng, endLat, endLng);

  return {
    coords,
    distanceMeters,
    durationSeconds,
    distanceKm: data?.distanceKm != null ? Number(data.distanceKm) : distanceMeters / 1000,
    durationMinutes:
      data?.durationMinutes != null
        ? Number(data.durationMinutes)
        : Math.max(1, Math.ceil(durationSeconds / 60)),
    polyline,
    provider: data?.provider ? String(data.provider) : undefined,
  };
}

/** Rough ETB fare preview matching backend defaults (base 90, 40/km, 20 per 4 min). */
export function estimateFareEtb(distanceKm: number, durationMinutes: number): number {
  const base = 90;
  const perKm = 40;
  const blockMinutes = 4;
  const blockCharge = 20;
  const minimum = 90;
  const distanceFare = distanceKm * perKm;
  const timeFare = Math.ceil(Math.max(durationMinutes, 1) / blockMinutes) * blockCharge;
  return Math.max(base + distanceFare + timeFare, minimum);
}
