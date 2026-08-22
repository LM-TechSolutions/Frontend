import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from './ui/utils';
import GebetaMap, { type GebetaMapRef } from '@gebeta/tiles';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { config, ADDIS_CENTER } from '../lib/config';
import { fetchRoadRoute, type RoadRoute } from '../lib/route';
import { api } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';
import i18n from '../i18n';

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

export type MapPerson = MapPoint & {
  id?: string;
  name?: string;
  status?: string;
  color?: string;
  label?: string;
  photoUrl?: string | null;
  kind?: 'driver' | 'customer';
  detail?: string;
};

interface GebetaMapViewProps {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  /** Shown in the live-address popup for the single `driver` marker, if provided. */
  driverName?: string | null;
  /** Profile photo for the live driver pin. Initials are used when this is missing. */
  driverPhoto?: string | null;
  driverStatus?: string | null;
  driverDetail?: string | null;
  /** Live fleet markers (e.g. available drivers on the dashboard map). Click any pin for its name/status + live address. */
  fleet?: MapPerson[];
  /**
   * Makes fleet markers selectable rather than merely informational - clicking
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
  /** Extra chrome that stays on the map in fullscreen. Position it with absolute classes. */
  overlay?: ReactNode;
  /** Hide the expand control. Default shows it. */
  allowFullscreen?: boolean;
  /** Controlled fullscreen. Omit to let the map manage its own state. */
  fullscreen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
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

function prettyStatus(status?: string | null) {
  if (!status) return '';
  const key = status.toLowerCase();
  if (key === 'available') return i18n.t('available', { ns: 'dashboard', defaultValue: 'Available' });
  if (key === 'busy') return i18n.t('onARide', { ns: 'dashboard', defaultValue: 'On a ride' });
  if (key === 'offline') return i18n.t('offline', { ns: 'dashboard', defaultValue: 'Offline' });
  return status;
}

function personHoverHtml(d: {
  name?: string | null;
  status?: string | null;
  color?: string;
  photoUrl?: string | null;
  kind?: 'driver' | 'customer';
  detail?: string | null;
}, address?: string) {
  const role = d.kind === 'customer'
    ? i18n.t('customer', { ns: 'common', defaultValue: 'Customer' })
    : i18n.t('driver', { ns: 'common', defaultValue: 'Driver' });
  const status = prettyStatus(d.status);
  const color = d.color ?? '#00BDC3';
  const face = d.photoUrl
    ? `<img src="${escapeHtml(d.photoUrl)}" alt="" />`
    : `<span>${escapeHtml(nameInitials(d.name))}</span>`;

  return `
    <div class="tokuma-hover-card">
      <div class="tokuma-hover-top">
        <div class="tokuma-hover-face" style="background:${escapeHtml(color)}">${face}</div>
        <div class="tokuma-hover-who">
          <p class="tokuma-hover-name">${escapeHtml(d.name || i18n.t('unknown', { ns: 'common', defaultValue: 'Unknown' }))}</p>
          <p class="tokuma-hover-role">${role}</p>
        </div>
      </div>
      ${status ? `<p class="tokuma-hover-status">${escapeHtml(status)}</p>` : ''}
      ${d.detail ? `<p class="tokuma-hover-detail">${escapeHtml(d.detail)}</p>` : ''}
      <p class="tokuma-hover-addr">${address ? escapeHtml(address) : i18n.t('findingStreet', { ns: 'common', defaultValue: 'Finding street…' })}</p>
    </div>
  `;
}

function bindPersonHover(el: HTMLElement, map: maplibregl.Map, person: MapPerson) {
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 18,
    anchor: 'bottom',
    className: 'tokuma-person-hover',
    maxWidth: '260px',
  });

  let requested = false;
  const show = () => {
    popup.setLngLat([person.lng, person.lat]).setHTML(personHoverHtml(person)).addTo(map);
    if (requested) return;
    requested = true;
    resolveAddress(person.lat, person.lng).then((address) => {
      if (!popup.isOpen()) return;
      popup.setHTML(personHoverHtml(person, address));
    });
  };
  const hide = () => popup.remove();
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
}

function nameInitials(name?: string | null) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Location pin with a face: photo when we have one, otherwise the start of the name.
 * Rank badges (assign-from-map) sit on the corner so the person stays readable.
 */
function makePersonPinElement(
  d: { color?: string; label?: string; name?: string | null; status?: string; photoUrl?: string | null },
  isSelected: boolean,
  interactive: boolean
) {
  const color = d.color ?? '#00BDC3';
  const size = isSelected ? 40 : 34;

  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:relative;
    display:flex;
    flex-direction:column;
    align-items:center;
    width:${size + 8}px;
    cursor:${interactive ? 'pointer' : 'default'};
    filter:drop-shadow(0 3px 8px rgba(0,0,0,.35));
    z-index:${isSelected ? 5 : 1};`;

  const head = document.createElement('div');
  head.style.cssText = `
    width:${size}px;
    height:${size}px;
    border-radius:50%;
    background:${color};
    border:${isSelected ? 3 : 2}px solid #fff;
    box-shadow:${isSelected ? `0 0 0 4px ${color}55` : 'none'};
    overflow:hidden;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#fff;
    font-weight:700;
    font-size:${size > 36 ? 14 : 12}px;
    line-height:1;
    letter-spacing:.02em;
    position:relative;`;
  head.textContent = nameInitials(d.name);

  if (d.photoUrl) {
    const img = document.createElement('img');
    img.src = d.photoUrl;
    img.alt = d.name || '';
    img.referrerPolicy = 'no-referrer';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
    img.addEventListener('error', () => img.remove());
    head.appendChild(img);
  }

  const tip = document.createElement('div');
  tip.style.cssText = `
    width:0;
    height:0;
    border-left:7px solid transparent;
    border-right:7px solid transparent;
    border-top:10px solid ${color};
    margin-top:-1px;`;

  wrap.appendChild(head);
  wrap.appendChild(tip);

  if (d.label) {
    const badge = document.createElement('span');
    badge.textContent = d.label;
    badge.style.cssText = `
      position:absolute;
      top:-4px;
      right:0;
      min-width:16px;
      height:16px;
      padding:0 4px;
      border-radius:999px;
      background:#042f32;
      color:#fff;
      font-size:10px;
      font-weight:700;
      display:flex;
      align-items:center;
      justify-content:center;
      border:2px solid #fff;
      line-height:1;`;
    wrap.appendChild(badge);
  }

  return wrap;
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
  driverPhoto,
  driverStatus,
  driverDetail,
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
  overlay,
  allowFullscreen = true,
  fullscreen: fullscreenProp,
  onFullscreenChange,
}: GebetaMapViewProps) {
  const { t } = useAppContext();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [internalFs, setInternalFs] = useState(false);
  const fullscreen = fullscreenProp ?? internalFs;
  const mapRef = useRef<GebetaMapRef>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const fleetMarkersRef = useRef<maplibregl.Marker[]>([]);
  const driverFaceRef = useRef('');
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
  const onFullscreenChangeRef = useRef(onFullscreenChange);
  onFullscreenChangeRef.current = onFullscreenChange;

  const setFullscreen = useCallback(
    (next: boolean) => {
      if (fullscreenProp === undefined) setInternalFs(next);
      onFullscreenChangeRef.current?.(next);
    },
    [fullscreenProp]
  );

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!fullscreen);
  }, [fullscreen, setFullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('map-fullscreen');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setFullscreen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('map-fullscreen');
      window.removeEventListener('keydown', onKey, true);
    };
  }, [fullscreen, setFullscreen]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        mapRef.current?.getMapInstance()?.resize();
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event('resize'));
    }, 80);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

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

    const driverFace = `${driverName ?? ''}|${driverPhoto ?? ''}|${driverStatus ?? ''}|${driverDetail ?? ''}`;
    const existingDriver = markersRef.current['driver'];
    if (!driver) {
      existingDriver?.remove();
      delete markersRef.current['driver'];
      driverFaceRef.current = '';
    } else if (existingDriver && driverFaceRef.current === driverFace) {
      existingDriver.setLngLat([driver.lng, driver.lat]);
    } else {
      existingDriver?.remove();
      const person: MapPerson = {
        lat: driver.lat,
        lng: driver.lng,
        name: driverName ?? undefined,
        photoUrl: driverPhoto,
        color: '#00BDC3',
        kind: 'driver',
        status: driverStatus ?? undefined,
        detail: driverDetail ?? undefined,
      };
      const el = makePersonPinElement(person, false, false);
      bindPersonHover(el, map, person);
      markersRef.current['driver'] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([driver.lng, driver.lat])
        .addTo(map);
      driverFaceRef.current = driverFace;
    }

    fleetMarkersRef.current.forEach((m) => m.remove());
    fleetMarkersRef.current = [];
    (fleet ?? []).forEach((d) => {
      const isSelected = Boolean(d.id && selectedFleetId && d.id === selectedFleetId);
      const el = makePersonPinElement(d, isSelected, Boolean(onFleetSelectRef.current));
      bindPersonHover(el, map, d);

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lng, d.lat]);

      if (onFleetSelectRef.current && d.id) {
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          onFleetSelectRef.current?.(d.id!);
        });
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
  }, [ready, pickup, dropoff, driver, driverName, driverPhoto, driverStatus, driverDetail, routeCoords, roadCoords, fleet, selectedFleetId, radiusKm]);

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
    <div
      ref={wrapRef}
      className={cn(className, fullscreen && 'fixed inset-0 z-[300] rounded-none')}
      style={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        height: fullscreen ? '100svh' : height,
        width: fullscreen ? '100vw' : undefined,
        borderRadius: fullscreen ? 0 : 12,
        overflow: 'hidden',
        zIndex: fullscreen ? 300 : undefined,
      }}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F3F4F6]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-xs text-[#6B7280]">{t('common.loadingMap')}</p>
          </div>
        </div>
      )}
      {ready && routeLoading && pickup && dropoff && (
        <div className="pointer-events-none absolute bottom-3 right-14 z-10 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          {t('common.calculatingRoute')}
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
      {overlay && <div className="pointer-events-none absolute inset-0 z-[20]">{overlay}</div>}
      {allowFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-3 top-3 z-[30] flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/95 text-foreground shadow-md backdrop-blur hover:bg-card"
          aria-label={fullscreen ? t('common.exitFullscreen') : t('common.fullscreenMap')}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
