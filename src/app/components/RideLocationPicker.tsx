import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Navigation, Loader2, Route } from 'lucide-react';
import { Input } from './ui/input';
import { api } from '../lib/api';
import { estimateFareEtb, type RoadRoute } from '../lib/route';
import { formatETB } from '../lib/format';
import GebetaMapView, { type MapPoint } from './GebetaMapView';
import { useAppContext } from '../contexts/AppContext';

export interface PlaceValue {
  lat: number;
  lng: number;
  address: string;
}

interface Suggestion {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface Props {
  pickup: PlaceValue | null;
  dropoff: PlaceValue | null;
  onChange: (which: 'pickup' | 'dropoff', value: PlaceValue) => void;
  /** Notified when the road route estimate updates (for create dialog summary). */
  onRouteChange?: (route: RoadRoute | null) => void;
}

/**
 * Google-Maps-style picker: type to get live Gebeta suggestions, or click the map
 * to drop a pin. Shows road-accurate distance once both points are set.
 */
export default function RideLocationPicker({ pickup, dropoff, onChange, onRouteChange }: Props) {
  const { t } = useAppContext();
  const [active, setActive] = useState<'pickup' | 'dropoff'>('pickup');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.map.search(q, 6);
        setSuggestions(res ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (s: Suggestion) => {
    onChange(active, { lat: s.latitude, lng: s.longitude, address: s.formattedAddress });
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  const setFromMap = (lat: number, lng: number) => {
    const target = active;
    onChange(target, { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    api.map
      .reverseGeocode(lat, lng)
      .then((r) => {
        const address = r?.address ?? r?.formattedAddress;
        if (address) onChange(target, { lat, lng, address });
      })
      .catch(() => {
        /* keep coordinate label */
      });
  };

  const handleRoute = (r: RoadRoute | null) => {
    setRoute(r);
    onRouteChange?.(r);
  };

  const pickupPoint: MapPoint | null = pickup ? { lat: pickup.lat, lng: pickup.lng } : null;
  const dropoffPoint: MapPoint | null = dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null;
  const farePreview =
    route != null ? estimateFareEtb(route.distanceKm, route.durationMinutes) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActive('pickup')}
          className={`flex items-center gap-2 p-2 rounded-lg border-2 text-sm transition-colors ${active === 'pickup' ? 'border-[#10B981] bg-[#10B981]/5' : 'border-border hover:border-muted-foreground'}`}
        >
          <MapPin className="w-4 h-4 text-[#10B981] flex-shrink-0" />
          <span className="truncate text-left text-foreground">{pickup ? pickup.address : t('dashboard.setPickup', 'Set Pickup')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActive('dropoff')}
          className={`flex items-center gap-2 p-2 rounded-lg border-2 text-sm transition-colors ${active === 'dropoff' ? 'border-[#EF4444] bg-[#EF4444]/5' : 'border-border hover:border-muted-foreground'}`}
        >
          <Navigation className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
          <span className="truncate text-left text-foreground">{dropoff ? dropoff.address : t('dashboard.setDestination', 'Set Destination')}</span>
        </button>
      </div>

      <div className="relative" ref={boxRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions[0]) {
              e.preventDefault();
              pick(suggestions[0]);
            }
          }}
          placeholder={active === 'pickup' ? t('dashboard.searchPickup', 'Search pickup...') : t('dashboard.searchDestination', 'Search destination...')}
          className="pl-10 pr-9"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}

        {open && suggestions.length > 0 && (
          <div className="absolute z-[500] mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((s, i) => (
              <button
                key={`${s.latitude}-${s.longitude}-${i}`}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2 border-b border-border last:border-0"
              >
                <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active === 'pickup' ? 'text-[#10B981]' : 'text-[#EF4444]'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.formattedAddress}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {open && !searching && query.trim().length >= 2 && suggestions.length === 0 && (
          <div className="absolute z-[500] mt-1 w-full bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
            No matches - click the map to drop a pin.
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {active === 'pickup' ? t('dashboard.settingPickup', 'Setting pickup') : t('dashboard.settingDestination', 'Setting destination')} - pick a suggestion above, or click the map.
      </p>

      <GebetaMapView
        pickup={pickupPoint}
        dropoff={dropoffPoint}
        height={280}
        autoRoadRoute
        onRouteResolved={handleRoute}
        onMapClick={(lng, lat) => setFromMap(lat, lng)}
      />

      {route && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2.5 text-sm">
          <Route className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-foreground">{route.distanceKm.toFixed(1)} km</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">~{route.durationMinutes} min</span>
          {farePreview != null && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-primary">Est. {formatETB(farePreview)}</span>
            </>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            Road route{route.provider ? ` · ${route.provider}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
