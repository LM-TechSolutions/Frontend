import { useEffect, useRef, useState, useCallback } from 'react';
import GebetaMap, { type GebetaMapRef } from '@gebeta/tiles';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { config, ADDIS_CENTER } from '../lib/config';
import { fetchRoadRoute, type RoadRoute } from '../lib/route';
import { api } from '../lib/api';

export interface MapPoint {
  lng: number;
  lat: number;
}

// Reverse-geocoded address cache, shared by every map instance on the page -
// driver dots move constantly but rarely leave the same street, so rounding
// to ~11m and caching avoids re-hitting the geocoder on every click/reopen.
const addressCache = new Map<string, string>();
function addressCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}
async function resolveAddress(lat: number, lng: number): Promise<string> {
  const key = addressCacheKey(lat, lng);
  const cached = addressCache.get(key);
  if (cached) return cached;
  try {
    const res = await api.map.reverseGeocode(lat, lng);
    const address = res?.formattedAddress || res?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    addressCache.set(key, address);
    return address;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface GebetaMapViewProps {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  /** Shown in the live-address popup for the single `driver` marker, if provided. */
  driverName?: string | null;
  /** Live fleet markers (e.g. available drivers on the dashboard map). Click any dot for its name/status + live address. */
  fleet?: Array<MapPoint & { id?: string; name?: string; status?: string; color?: string; label?: string }>;
  /**
   * Makes fleet markers selectable rather than merely informational — clicking
   * one calls back with its id. Used by map-based ride assignment, where the
   * pin *is* the control.
   */
  onFleetSelect?: (id: string) => void;
  /** The currently selected fleet marker, drawn larger with a halo. */
  selectedFleetId?: string | null;
  /** Draws a translucent radius ring around `pickup` (kilometres). */
  radiusKm?: number | null;
  /** Explicit route as [lng,lat] pairs. Wins over auto road fetch. */
  routeCoords?: [number, number][];
  /** When true (default) and pickup+dropoff exist, fetch Gebeta road geometry. */
  autoRoadRoute?: boolean;
  /** Called whenever an auto-fetched (or cleared) road route resolves. */
  onRouteResolved?: (route: RoadRoute | null) => void;
  height?: number | string;
  zoom?: number;
  onMapClick?: (lng: number, lat: number) => void;
  className?: string;
}

// Popup content goes through setHTML (raw innerHTML) - driver names and
// reverse-geocoded addresses are untrusted data, so escape before injecting.
function escapeHtml(s: string) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function makePinElement(color: string, label?: string) {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
    background: ${color}; transform: rotate(-45deg);
    border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3);
    display: flex; align-items: center; justify-content: center;`;
  if (label) {
    const inner = document.createElement('span');
    inner.textContent = label;
    inner.style.cssText = 'transform: rotate(45deg); font-size: 12px;';
    el.appendChild(inner);
  }
  return el;
}

function pointsKey(a?: MapPoint | null, b?: MapPoint | null) {
  if (!a || !b) return '';
  return `${a.lat.toFixed(5)},${a.lng.toFixed(5)}→${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
}

/**
 * Fleet dot. Selected markers grow, gain a halo and a rank label, and sit above
 * their neighbours, so the pin the operator picked stays findable in a cluster.
 */
function makeFleetElement(
  d: { color?: string; label?: string; name?: string; status?: string },
  isSelected: boolean,
  interactive: boolean
) {
  const el = document.createElement('div');
  const color = d.color ?? '#00BDC3';
  const size = isSelected ? 30 : d.label ? 22 : 14;

  el.style.cssText = `
    width:${size}px; height:${size}px; border-radius:50%;
    background:${color};
    border:${isSelected ? 3 : 2}px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.3)${isSelected ? `, 0 0 0 6px ${color}33` : ''};
    cursor:${interactive ? 'pointer' : 'default'};
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:${isSelected ? 13 : 11}px; font-weight:600;
    line-height:1; transition:width .15s ease, height .15s ease;
    z-index:${isSelected ? 5 : 1};`;

  if (d.label) el.textContent = d.label;
  if (d.name) el.title = d.status ? `${d.name} · ${d.status}` : d.name;
  return el;
}

/** Approximate circle as a GeoJSON polygon, for the pickup radius ring. */
function circlePolygon(lat: number, lng: number, radiusKm: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const latRadius = radiusKm / 110.574;
  const lngRadius = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngRadius * Math.cos(theta), lat + latRadius * Math.sin(theta)]);
  }

  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export default function GebetaMapView({
  pickup,
  dropoff,
  driver,
  driverName,
  fleet,
  onFleetSelect,
  selectedFleetId,
  radiusKm,
  routeCoords,
  autoRoadRoute = true,
  onRouteResolved,
  height = 400,
  zoom = 12,
  onMapClick,
  className,
}: GebetaMapViewProps) {
  const mapRef = useRef<GebetaMapRef>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const fleetMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onFleetSelectRef = useRef(onFleetSelect);
  onFleetSelectRef.current = onFleetSelect;
  const onRouteResolvedRef = useRef(onRouteResolved);
  onRouteResolvedRef.current = onRouteResolved;
  const [ready, setReady] = useState(false);
  const [roadCoords, setRoadCoords] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const fetchGen = useRef(0);

  const handleMapClick = useCallback((lngLat: [number, number]) => {
    onMapClickRef.current?.(lngLat[0], lngLat[1]);
  }, []);

  useEffect(() => {
    if (!ready || !onMapClick) return;
    const map = mapRef.current?.getMapInstance();
    if (!map) return;
    try {
      map.getCanvas().style.cursor = 'crosshair';
    } catch {
      /* ignore */
    }
  }, [ready, onMapClick]);

  // Auto-fetch Gebeta road geometry whenever pickup/dropoff change.
  useEffect(() => {
    if (!autoRoadRoute || routeCoords) {
      setRoadCoords(null);
      return;
    }
    if (!pickup || !dropoff) {
      setRoadCoords(null);
      onRouteResolvedRef.current?.(null);
      return;
    }

    const gen = ++fetchGen.current;
    const key = pointsKey(pickup, dropoff);
    setRouteLoading(true);

    fetchRoadRoute(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
      .then((route) => {
        if (fetchGen.current !== gen) return;
        if (pointsKey(pickup, dropoff) !== key) return;
        setRoadCoords(route.coords);
        onRouteResolvedRef.current?.(route);
      })
      .catch(() => {
        if (fetchGen.current !== gen) return;
        setRoadCoords(null);
        onRouteResolvedRef.current?.(null);
      })
      .finally(() => {
        if (fetchGen.current === gen) setRouteLoading(false);
      });
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, autoRoadRoute, routeCoords]);

  const center: [number, number] = pickup
    ? [pickup.lng, pickup.lat]
    : driver
    ? [driver.lng, driver.lat]
    : ADDIS_CENTER;

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current?.getMapInstance();
    if (!map) return;

    // The wrapper's onMapLoaded can fire before MapLibre's own style is
    // actually done parsing (isStyleLoaded() still false) - addSource/
    // addLayer throw "Style is not done loading" in that window. Defer this
    // whole update until the style genuinely settles, retrying on 'idle'
    // until it does (usually just one extra tick, if any).
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) {
        map.once('idle', run);
        return;
      }
      applyUpdate(map);
    };
    run();
    return () => {
      cancelled = true;
      map.off('idle', run);
    };

    function applyUpdate(map: maplibregl.Map) {
    const upsert = (key: string, point: MapPoint | null | undefined, color: string, label: string) => {
      if (!point) {
        markersRef.current[key]?.remove();
        delete markersRef.current[key];
        return;
      }
      const existing = markersRef.current[key];
      if (existing) {
        existing.setLngLat([point.lng, point.lat]);
      } else {
        markersRef.current[key] = new maplibregl.Marker({ element: makePinElement(color, label) })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      }
    };

    upsert('pickup', pickup, '#10B981', 'P');
    upsert('dropoff', dropoff, '#EF4444', 'D');
    upsert('driver', driver, '#00BDC3', '🚗');

    // The single "driver" marker (ride tracking / driver detail) is at most
    // one instance, so it's cheap to eagerly resolve+refresh its address on
    // every live position update rather than waiting for a click.
    const driverMarker = markersRef.current['driver'];
    if (driverMarker && driver) {
      const popup = driverMarker.getPopup() ?? new maplibregl.Popup({ offset: 20, closeButton: false });
      const title = driverName ? `<strong>${escapeHtml(driverName)}</strong><br/>` : '';
      popup.setHTML(`${title}<span class="text-xs text-muted-foreground">Locating…</span>`);
      driverMarker.setPopup(popup);
      resolveAddress(driver.lat, driver.lng).then((address) => {
        popup.setHTML(`${title}${escapeHtml(address)}`);
      });
    }

    fleetMarkersRef.current.forEach((m) => m.remove());
    fleetMarkersRef.current = [];
    (fleet ?? []).forEach((d) => {
      const isSelected = Boolean(d.id && selectedFleetId && d.id === selectedFleetId);
      const el = makeFleetElement(d, isSelected, Boolean(onFleetSelectRef.current));

      const marker = new maplibregl.Marker({ element: el }).setLngLat([d.lng, d.lat]);

      if (onFleetSelectRef.current && d.id) {
        // The pin is the control: selecting is the click's whole job, so no
        // popup competes with it for the same gesture.
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          onFleetSelectRef.current?.(d.id!);
        });
      } else {
        const title = d.name
          ? `<strong>${escapeHtml(d.name)}</strong>${d.status ? ` · ${escapeHtml(d.status)}` : ''}<br/>`
          : '';
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
          `${title}<span class="text-xs text-muted-foreground">Locating…</span>`
        );
        // Lazy: only spend a reverse-geocode call once this specific driver's
        // popup is actually opened, not on every location tick for the whole fleet.
        popup.on('open', () => {
          resolveAddress(d.lat, d.lng).then((address) => {
            popup.setHTML(`${title}${escapeHtml(address)}`);
          });
        });
        marker.setPopup(popup);
      }

      marker.addTo(map);
      fleetMarkersRef.current.push(marker);
    });

    // Radius ring around the pickup, so an operator can see at a glance which
    // drivers fall inside the dispatch radius.
    const ringId = 'pickup-radius';
    const existingRing = map.getSource(ringId) as maplibregl.GeoJSONSource | undefined;
    if (pickup && radiusKm && radiusKm > 0) {
      const ring = circlePolygon(pickup.lat, pickup.lng, radiusKm);
      if (existingRing) {
        existingRing.setData(ring);
      } else {
        map.addSource(ringId, { type: 'geojson', data: ring });
        map.addLayer({
          id: `${ringId}-fill`,
          type: 'fill',
          source: ringId,
          paint: { 'fill-color': '#00BDC3', 'fill-opacity': 0.07 },
        });
        map.addLayer({
          id: `${ringId}-line`,
          type: 'line',
          source: ringId,
          paint: { 'line-color': '#00BDC3', 'line-width': 1.5, 'line-opacity': 0.5, 'line-dasharray': [2, 2] },
        });
      }
    } else if (existingRing) {
      existingRing.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[]] } });
    }

    // Render route using MapLibre GL native GeoJSON line layers for smooth, road-accurate polylines
    const path: [number, number][] =
      routeCoords && routeCoords.length > 1
        ? routeCoords
        : roadCoords && roadCoords.length > 1
        ? roadCoords
        : [];

    try {
      mapRef.current?.clearPaths();
    } catch {
      /* ignore */
    }

    if (map) {
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      };

      const source = map.getSource('road-route-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojson);
      } else if (path.length > 1) {
        map.addSource('road-route-source', {
          type: 'geojson',
          data: geojson,
        });

        // Glow background layer
        map.addLayer({
          id: 'road-route-glow',
          type: 'line',
          source: 'road-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#00BDC3',
            'line-width': 10,
            'line-opacity': 0.35,
          },
        });

        // Crisp road line layer
        map.addLayer({
          id: 'road-route-line',
          type: 'line',
          source: 'road-route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#00C4D6',
            'line-width': 5,
            'line-opacity': 0.95,
          },
        });
      }
    }

    const pts = [pickup, dropoff, driver].filter(Boolean) as MapPoint[];
    if (pts.length === 1) {
      map.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 14, duration: 600 });
    } else if (pts.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      pts.forEach((p) => bounds.extend([p.lng, p.lat]));
      if (path.length > 2) {
        path.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      }
      map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 600 });
    }
    }
  }, [ready, pickup, dropoff, driver, driverName, routeCoords, roadCoords, fleet, selectedFleetId, radiusKm]);

  if (!config.gebetaApiKey) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E5E7EB', borderRadius: 12 }}
      >
        <p className="text-[#6B7280] text-sm">Set VITE_GEBETA_API_KEY to enable the map.</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden' }}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F3F4F6]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-4 border-[#00BDC3]/30 border-t-[#00BDC3] animate-spin" />
            <p className="text-xs text-[#6B7280]">Loading map…</p>
          </div>
        </div>
      )}
      {ready && routeLoading && pickup && dropoff && (
        <div className="absolute top-3 left-3 z-10 rounded-full bg-white/95 border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#0B5A60] shadow">
          Calculating road route…
        </div>
      )}
      <GebetaMap
        ref={mapRef}
        apiKey={config.gebetaApiKey}
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        onMapLoaded={() => setReady(true)}
        onMapClick={onMapClick ? handleMapClick : undefined}
      />
    </div>
  );
}
