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
 * Road-accurate route via backend Gebeta `/map/route` (OSM fallback server-side).
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
  const coords =
    polyline && polyline.length > 0
      ? decodePolyline(polyline)
      : ([
          [startLng, startLat],
          [endLng, endLat],
        ] as [number, number][]);

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
