import { useEffect, useRef, useState } from 'react';
import GebetaMap, { type GebetaMapRef } from '@gebeta/tiles';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { config, ADDIS_CENTER } from '../lib/config';

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
  /** Explicit route as [lng,lat] pairs. If omitted, a path is drawn through the points. */
  routeCoords?: [number, number][];
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

export default function GebetaMapView({
  pickup,
  dropoff,
  driver,
  routeCoords,
  height = 400,
  zoom = 12,
  onMapClick,
  className,
}: GebetaMapViewProps) {
  const mapRef = useRef<GebetaMapRef>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [ready, setReady] = useState(false);

  const center: [number, number] = pickup
    ? [pickup.lng, pickup.lat]
    : driver
    ? [driver.lng, driver.lat]
    : ADDIS_CENTER;

  // Draw / update markers + route whenever points change.
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

    // Route path: explicit, else connect pickup → driver → dropoff.
    const path =
      routeCoords && routeCoords.length > 1
        ? routeCoords
        : ([pickup, driver, dropoff].filter(Boolean) as MapPoint[]).map((p) => [p.lng, p.lat] as [number, number]);

    try {
      mapRef.current?.clearPaths();
      if (path.length > 1) {
        mapRef.current?.addPath(path, { color: '#00BDC3', width: 4 } as any);
      }
    } catch {
      /* addPath signature differences are non-fatal */
    }

    // Fit the visible points.
    const pts = [pickup, dropoff, driver].filter(Boolean) as MapPoint[];
    if (pts.length === 1) {
      map.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 14, duration: 600 });
    } else if (pts.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      pts.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 600 });
    }
  }, [ready, pickup, dropoff, driver, routeCoords]);

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
      <GebetaMap
        ref={mapRef}
        apiKey={config.gebetaApiKey}
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        onMapLoaded={() => setReady(true)}
        onMapClick={onMapClick ? (lngLat) => onMapClick(lngLat[0], lngLat[1]) : undefined}
      />
    </div>
  );
}
