import { useEffect, useRef, useState, useCallback } from 'react';
import GebetaMap, { type GebetaMapRef } from '@gebeta/tiles';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { config, ADDIS_CENTER } from '../lib/config';
import { fetchRoadRoute, type RoadRoute } from '../lib/route';

export interface MapPoint {
  lng: number;
  lat: number;
}

interface GebetaMapViewProps {
  pickup?: MapPoint | null;
  dropoff?: MapPoint | null;
  driver?: MapPoint | null;
  /** Live fleet markers (e.g. available drivers on the dashboard map). */
  fleet?: Array<MapPoint & { color?: string }>;
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

export default function GebetaMapView({
  pickup,
  dropoff,
  driver,
  fleet,
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

    fleetMarkersRef.current.forEach((m) => m.remove());
    fleetMarkersRef.current = [];
    (fleet ?? []).forEach((d) => {
      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${d.color ?? '#00BDC3'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);`;
      fleetMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(map));
    });

    // Prefer explicit coords → road route → never prefer straight over road when loading finishes.
    const path: [number, number][] =
      routeCoords && routeCoords.length > 1
        ? routeCoords
        : roadCoords && roadCoords.length > 1
        ? roadCoords
        : ([pickup, dropoff].filter(Boolean) as MapPoint[]).map((p) => [p.lng, p.lat] as [number, number]);

    try {
      mapRef.current?.clearPaths();
      if (path.length > 1) {
        mapRef.current?.addPath(path, { color: '#00BDC3', width: 4 } as any);
      }
    } catch {
      /* addPath signature differences are non-fatal */
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
  }, [ready, pickup, dropoff, driver, routeCoords, roadCoords, fleet]);

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
