import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { api } from '../lib/api';
import GebetaMapView, { type MapPoint } from './GebetaMapView';

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
}

/**
 * Google-Maps-style picker: type to get live Gebeta suggestions, or click the map
 * to drop a pin (reverse-geocoded to an address). Toggle which point you're setting.
 */
export default function RideLocationPicker({ pickup, dropoff, onChange }: Props) {
  const [active, setActive] = useState<'pickup' | 'dropoff'>('pickup');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Live (debounced) autocomplete as the user types.
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

  // Close the dropdown when clicking outside.
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

  // Map click → drop the pin instantly (coords), then refine to a real address.
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

  const pickupPoint: MapPoint | null = pickup ? { lat: pickup.lat, lng: pickup.lng } : null;
  const dropoffPoint: MapPoint | null = dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActive('pickup')}
          className={`flex items-center gap-2 p-2 rounded-lg border-2 text-sm transition-colors ${active === 'pickup' ? 'border-[#10B981] bg-[#10B981]/5' : 'border-border hover:border-muted-foreground'}`}
        >
          <MapPin className="w-4 h-4 text-[#10B981] flex-shrink-0" />
          <span className="truncate text-left text-foreground">{pickup ? pickup.address : 'Set Pickup'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActive('dropoff')}
          className={`flex items-center gap-2 p-2 rounded-lg border-2 text-sm transition-colors ${active === 'dropoff' ? 'border-[#EF4444] bg-[#EF4444]/5' : 'border-border hover:border-muted-foreground'}`}
        >
          <Navigation className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
          <span className="truncate text-left text-foreground">{dropoff ? dropoff.address : 'Set Destination'}</span>
        </button>
      </div>

      {/* Autocomplete search */}
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
          placeholder={`Search ${active === 'pickup' ? 'pickup' : 'destination'}…`}
          className="pl-10 pr-9"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00BDC3] animate-spin" />}

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
            No matches — click the map to drop a pin.
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Setting <strong>{active === 'pickup' ? 'pickup' : 'destination'}</strong> — pick a suggestion above, or click the map.
      </p>

      <GebetaMapView pickup={pickupPoint} dropoff={dropoffPoint} height={280} onMapClick={(lng, lat) => setFromMap(lat, lng)} />
    </div>
  );
}
