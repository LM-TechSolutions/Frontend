import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Loader2, MapPin, Navigation, Phone, Route, Search, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { api } from '../lib/api';
import { estimateFareEtb, type RoadRoute } from '../lib/route';
import { formatETB } from '../lib/format';
import RideLocationPicker, { type PlaceValue } from './RideLocationPicker';
import GebetaMapView from './GebetaMapView';
import { useAppContext } from '../contexts/AppContext';
import { cn } from './ui/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface Suggestion {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

function normalizePhone(raw: string) {
  const trimmed = raw.trim().replace(/[^\d+]/g, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('251')) return `+${trimmed}`;
  if (trimmed.startsWith('0')) return `+251${trimmed.slice(1)}`;
  return `+251${trimmed}`;
}

export default function NewRideDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useAppContext();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [pickup, setPickup] = useState<PlaceValue | null>(null);
  const [dropoff, setDropoff] = useState<PlaceValue | null>(null);
  const [active, setActive] = useState<'pickup' | 'dropoff'>('pickup');
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [creating, setCreating] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [mapFs, setMapFs] = useState(false);
  const [fsQuery, setFsQuery] = useState('');
  const [fsHits, setFsHits] = useState<Suggestion[]>([]);
  const [fsSearching, setFsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) return;
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setPickup(null);
    setDropoff(null);
    setRoute(null);
    setActive('pickup');
    setMapFs(false);
    setFsQuery('');
    setFsHits([]);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = fsQuery.trim();
    if (q.length < 2) {
      setFsHits([]);
      setFsSearching(false);
      return;
    }
    setFsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.map.search(q, 6);
        setFsHits(res ?? []);
      } catch {
        setFsHits([]);
      } finally {
        setFsSearching(false);
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fsQuery]);

  const handleChange = (which: 'pickup' | 'dropoff', v: PlaceValue) => {
    if (which === 'pickup') {
      setPickup(v);
      if (!dropoff) setActive('dropoff');
    } else {
      setDropoff(v);
    }
  };

  const dropPin = (lat: number, lng: number) => {
    const target = active;
    const next = { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    handleChange(target, next);
    api.map
      .reverseGeocode(lat, lng)
      .then((r) => {
        const address = r?.address ?? r?.formattedAddress;
        if (address) handleChange(target, { lat, lng, address });
      })
      .catch(() => undefined);
  };

  const pickSuggestion = (s: Suggestion) => {
    handleChange(active, { lat: s.latitude, lng: s.longitude, address: s.formattedAddress || s.name });
    setFsQuery('');
    setFsHits([]);
  };

  const swap = () => {
    setPickup(dropoff);
    setDropoff(pickup);
  };

  const phone = normalizePhone(customerPhone);
  const phoneOk = phone.length >= 10;
  const ready = phoneOk && pickup && dropoff;
  const farePreview = route != null ? estimateFareEtb(route.distanceKm, route.durationMinutes) : null;
  const missing = !phoneOk ? t('rides.addCustomerPhone') : !pickup ? t('rides.setPickup') : !dropoff ? t('rides.setDropoff') : null;

  const submit = async () => {
    if (!phone) {
      toast.error(t('rides.phoneRequired'));
      return;
    }
    if (!pickup || !dropoff) {
      toast.error(t('rides.setPickupDropoff'));
      return;
    }
    await createRide(false);
  };

  /**
   * Create the ride, unless this caller already has one in flight.
   *
   * The backend refuses a likely double-booking with 409 rather than silently
   * creating a second ride — two operators taking the same call, or one
   * double-clicking, used to send two drivers to one passenger. A repeat
   * booking from the same number is a real thing, so this offers to proceed
   * rather than blocking; [force] is that confirmation, and it is only ever
   * set by the operator answering the prompt.
   */
  const createRide = async (force: boolean) => {
    if (!pickup || !dropoff) return;
    setCreating(true);
    try {
      await api.rides.create({
        customerName: customerName.trim() || t('rides.guest'),
        customerPhone: phone,
        pickupLocation: pickup.address,
        pickupCoordinates: { lat: pickup.lat, lng: pickup.lng },
        dropoffLocation: dropoff.address,
        dropoffCoordinates: { lat: dropoff.lat, lng: dropoff.lng },
        notes: notes.trim() || undefined,
        estimatedDistanceKm: route?.distanceKm,
        estimatedDurationMinutes: route?.durationMinutes,
        ...(force ? { allowDuplicate: true } : {}),
      });
      toast.success(t('rides.rideCreatedDispatch'));
      setDuplicateOpen(false);
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_RIDE' || e?.status === 409) {
        setDuplicateOpen(true);
        return;
      }
      toast.error(e?.message ?? t('rides.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
    <AlertDialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rides.duplicateTitle', 'This caller already has a ride')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'rides.duplicateBody',
              'A ride for this number was booked in the last few minutes and has not finished. Book another only if they really want a second car.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={creating}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={creating} onClick={() => void createRide(true)}>
            {t('rides.duplicateConfirm', 'Book anyway')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1120px,96vw)] gap-0 overflow-hidden p-0 sm:max-w-[min(1120px,96vw)]">
        <div className="grid max-h-[92vh] grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_26rem]">
          <div className="relative min-h-[280px] lg:min-h-[640px]">
            <GebetaMapView
              pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
              dropoff={dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null}
              height="100%"
              autoRoadRoute
              onRouteResolved={setRoute}
              onMapClick={(lng, lat) => dropPin(lat, lng)}
              className="h-full min-h-[280px] w-full lg:min-h-[640px]"
              fullscreen={mapFs}
              onFullscreenChange={setMapFs}
              overlay={
                <>
                  <div className="pointer-events-auto absolute left-3 top-3 flex max-w-[min(100%-4.5rem,24rem)] flex-col gap-2">
                    <div className="rounded-2xl border border-border/80 bg-card/95 p-2 shadow-md backdrop-blur">
                      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t('rides.clickMapSet', 'Click the map to set {target}', { target: active === 'pickup' ? t('rides.pickup', 'pickup') : t('rides.dropoff', 'drop-off') })}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setActive('pickup')}
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium',
                            active === 'pickup' ? 'bg-[#10B981]/15 text-[#0B7A55]' : 'hover:bg-muted'
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{pickup ? pickup.address : t('rides.pickup', 'Pickup')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActive('dropoff')}
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium',
                            active === 'dropoff' ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted'
                          )}
                        >
                          <Navigation className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{dropoff ? dropoff.address : t('rides.dropoff', 'Drop-off')}</span>
                        </button>
                      </div>
                    </div>

                    {mapFs && (
                      <div className="rounded-2xl border border-border/80 bg-card/95 p-2 shadow-md backdrop-blur">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={fsQuery}
                            onChange={(e) => setFsQuery(e.target.value)}
                            placeholder={active === 'pickup' ? t('rides.searchPickup', 'Search pickup…') : t('rides.searchDropoff', 'Search drop-off…')}
                            className="h-9 pl-8 pr-8"
                          />
                          {fsSearching && (
                            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />
                          )}
                        </div>
                        {fsHits.length > 0 && (
                          <div className="mt-1 max-h-44 overflow-auto">
                            {fsHits.map((s, i) => (
                              <button
                                key={`${s.latitude}-${s.longitude}-${i}`}
                                type="button"
                                onClick={() => pickSuggestion(s)}
                                className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                              >
                                <MapPin className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active === 'pickup' ? 'text-[#10B981]' : 'text-destructive')} />
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-medium">{s.name}</span>
                                  <span className="block truncate text-[11px] text-muted-foreground">{s.formattedAddress}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {mapFs && (
                      <Button className="shadow-md" onClick={() => void submit()} disabled={creating || !ready}>
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {ready ? t('rides.createAndDispatch', 'Create and dispatch') : missing}
                      </Button>
                    )}
                  </div>
                  {route && (
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
                      {t('rides.routeSummary', '{km} km · ~{min} min', { km: route.distanceKm.toFixed(1), min: route.durationMinutes })}
                      {farePreview != null ? ` · ${formatETB(farePreview)}` : ''}
                    </div>
                  )}
                </>
              }
            />
          </div>

          <div className="flex min-h-0 flex-col border-t border-border/70 lg:border-l lg:border-t-0">
            <DialogHeader className="space-y-1 border-b border-border/70 px-5 py-4 text-left">
              <DialogTitle className="font-display text-xl">{t('rides.createRide', 'New ride')}</DialogTitle>
              <DialogDescription>{t('rides.dialogHint', 'Customer first, then pickup and drop-off. Dispatch starts as soon as you create.')}</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <ol className="grid grid-cols-3 gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <li className={cn('rounded-full px-2 py-1 text-center', phoneOk ? 'bg-primary/12 text-primary' : 'bg-muted')}>{t('rides.stepPhone', '1 Phone')}</li>
                <li className={cn('rounded-full px-2 py-1 text-center', pickup ? 'bg-primary/12 text-primary' : 'bg-muted')}>{t('rides.stepPickup', '2 Pickup')}</li>
                <li className={cn('rounded-full px-2 py-1 text-center', dropoff ? 'bg-primary/12 text-primary' : 'bg-muted')}>{t('rides.stepDropoff', '3 Drop-off')}</li>
              </ol>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {t('common.name', 'Name')}
                </Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('rides.guestIfBlank', 'Guest if blank')} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {t('common.phone', 'Phone')}
                </Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0911 234567"
                  inputMode="tel"
                  autoComplete="tel"
                />
                {customerPhone.trim() ? (
                  <p className="text-[11px] text-muted-foreground">{t('rides.savesAs', 'Saves as {phone}', { phone })}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t('rides.localPhoneHint', 'Local 09 numbers become +251 automatically.')}</p>
                )}
              </div>

              <RideLocationPicker
                pickup={pickup}
                dropoff={dropoff}
                onChange={handleChange}
                onRouteChange={setRoute}
                hideMap
                active={active}
                onActiveChange={setActive}
              />

              <Button type="button" variant="outline" size="sm" className="w-full" onClick={swap} disabled={!pickup && !dropoff}>
                <ArrowLeftRight className="mr-2 h-4 w-4" /> {t('rides.swapPickupDropoff', 'Swap pickup and drop-off')}
              </Button>

              <div className="space-y-2">
                <Label>{t('common.notes', 'Notes')}</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('rides.notesPlaceholder', 'Gate, landmark, caller notes')} />
              </div>

              {route && (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-sm">
                  <Route className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-semibold">{t('rides.kmValue', '{n} km', { n: route.distanceKm.toFixed(1) })}</span>
                  <span className="text-muted-foreground">{t('rides.minApprox', '~{n} min', { n: route.durationMinutes })}</span>
                  {farePreview != null && <span className="ml-auto font-semibold text-primary">{formatETB(farePreview)}</span>}
                </div>
              )}

              <ul className="space-y-1.5 text-xs">
                <ReadyRow ok={phoneOk} label={t('rides.readyPhone', 'Customer phone')} />
                <ReadyRow ok={!!pickup} label={t('rides.readyPickup', 'Pickup pin')} />
                <ReadyRow ok={!!dropoff} label={t('rides.readyDropoff', 'Drop-off pin')} />
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/70 px-5 py-4">
              {missing && <p className="text-center text-[11px] text-muted-foreground">{missing}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button className="flex-1" onClick={() => void submit()} disabled={creating || !ready}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('rides.createAndDispatch', 'Create and dispatch')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ReadyRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn('flex items-center gap-2', ok ? 'text-primary' : 'text-muted-foreground')}>
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', ok ? 'bg-primary/15' : 'bg-muted')}>
        {ok ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
      </span>
      {label}
    </li>
  );
}
