import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Car,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Star,
  Ticket,
  Timer,
  Zap,
} from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { api, type AssignmentCandidate, type NearbyDriversResponse } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import GebetaMapView from './GebetaMapView';
import { Initials } from './coupons/CouponAtoms';

interface AssignFromMapDialogProps {
  ride: { id: string; customerName?: string; pickupLocation?: string } | null;
  onClose: () => void;
  onAssigned?: () => void;
}

/**
 * Assign a driver to a ride from the map.
 *
 * The pin *is* the control: the map and the ranked list are two views of one
 * selection, so clicking a marker highlights its row and vice versa. Drivers
 * who cannot take the ride are still shown - greyed, with the reason - because
 * an operator looking at an empty map cannot tell "nobody nearby" from
 * "everybody nearby is out of coupons".
 */
export default function AssignFromMapDialog({ ride, onClose, onAssigned }: AssignFromMapDialogProps) {
  const [data, setData] = useState<NearbyDriversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [mapFs, setMapFs] = useState(false);

  const load = useCallback(async () => {
    if (!ride) return;
    try {
      const res = await api.rides.nearbyDrivers(ride.id);
      setData(res);
      // Preselect the nearest assignable driver - the answer the operator
      // wanted most of the time, still one confirmation away from happening.
      setSelectedId((current) => current ?? res.candidates.find((c) => c.isEligible)?.driverId ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not load nearby drivers');
    } finally {
      setLoading(false);
    }
  }, [ride]);

  useEffect(() => {
    if (!ride) {
      setData(null);
      setSelectedId(null);
      setShowBlocked(false);
      setLoading(true);
      setMapFs(false);
      return;
    }
    load();
  }, [ride, load]);

  // Follow live driver movement while the panel is open.
  useEffect(() => {
    if (!ride) return;
    const socket = getSocket() ?? connectSocket();
    const onLocation = (payload: any) => {
      if (!payload?.driverId || typeof payload.latitude !== 'number') return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.driverId === payload.driverId
                  ? { ...c, latitude: payload.latitude, longitude: payload.longitude }
                  : c
              ),
            }
          : prev
      );
    };
    socket.on('driver:location', onLocation);
    return () => {
      socket.off('driver:location', onLocation);
    };
  }, [ride]);

  const eligible = useMemo(() => data?.candidates.filter((c) => c.isEligible) ?? [], [data]);
  const blocked = useMemo(() => data?.candidates.filter((c) => !c.isEligible) ?? [], [data]);
  const shown = showBlocked ? [...eligible, ...blocked] : eligible;
  const selected = data?.candidates.find((c) => c.driverId === selectedId) ?? null;

  const fleet = useMemo(
    () =>
      shown
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c, index) => ({
          id: c.driverId,
          lat: c.latitude as number,
          lng: c.longitude as number,
          name: c.name,
          status: c.isEligible ? `${c.distanceKm ?? '?'} km away` : (c.blockedReason ?? 'unavailable'),
          color: c.isEligible ? '#10B981' : '#9CA3AF',
          label: c.isEligible ? String(index + 1) : undefined,
          photoUrl: c.photoUrl ?? null,
          kind: 'driver' as const,
          detail: [
            c.vehicleType && c.vehiclePlate ? `${c.vehicleType} · ${c.vehiclePlate}` : c.vehiclePlate,
            c.etaMinutes != null ? `~${c.etaMinutes} min` : null,
            `${c.couponBalance} coupons`,
          ]
            .filter(Boolean)
            .join(' · '),
        })),
    [shown]
  );

  const assign = async () => {
    if (!ride || !selected) return;
    setAssigning(true);
    try {
      await api.rides.assign(ride.id, selected.driverId);
      toast.success(`Ride assigned to ${selected.name}`);
      onAssigned?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not assign the driver');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={!!ride} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(1100px,95vw)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Assign a driver{ride?.customerName ? ` - ${ride.customerName}` : ''}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
            <span className="truncate">{data?.pickup.address ?? ride?.pickupLocation ?? 'Loading pickup…'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
          {/* Map */}
          <div className="relative min-h-[320px] border-b border-border/70 lg:border-b-0 lg:border-r">
            {data && (
              <GebetaMapView
                pickup={{ lat: data.pickup.latitude, lng: data.pickup.longitude }}
                fleet={fleet}
                onFleetSelect={setSelectedId}
                selectedFleetId={selectedId}
                radiusKm={3}
                autoRoadRoute={false}
                height="100%"
                zoom={13}
                className="h-full w-full"
                fullscreen={mapFs}
                onFullscreenChange={setMapFs}
                overlay={
                  <>
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
                      <div className="flex items-center gap-3 text-[11px] text-card-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Assignable
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" /> Unavailable
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] opacity-60" /> Pickup
                        </span>
                      </div>
                    </div>
                    {mapFs && selected && (
                      <div className="pointer-events-auto absolute left-3 top-3 max-w-[min(100%-4.5rem,20rem)] rounded-2xl border border-border/80 bg-card/95 p-3 shadow-md backdrop-blur">
                        <p className="truncate text-sm font-semibold">{selected.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selected.vehicleType} · {selected.vehiclePlate}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {selected.distanceKm != null ? `${selected.distanceKm} km` : 'Distance unknown'}
                          {selected.etaMinutes != null ? ` · ~${selected.etaMinutes} min` : ''}
                          {selected.couponBalance != null ? ` · ${selected.couponBalance} coupons` : ''}
                        </p>
                        <Button size="sm" className="mt-2 w-full" disabled={assigning || !selected.isEligible} onClick={() => void assign()}>
                          {assigning ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                          Assign {selected.name.split(' ')[0]}
                        </Button>
                      </div>
                    )}
                    {mapFs && !selected && (
                      <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
                        Tap a numbered pin to pick a driver
                      </div>
                    )}
                  </>
                }
              />
            )}
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-3">
              <p className="text-sm font-medium text-foreground">
                {loading ? 'Finding drivers…' : `${eligible.length} driver${eligible.length === 1 ? '' : 's'} nearby`}
              </p>
              <div className="flex items-center gap-1">
                {blocked.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setShowBlocked((v) => !v)}
                  >
                    {showBlocked ? 'Hide' : `Show ${blocked.length} unavailable`}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={load} aria-label="Refresh">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {!loading && shown.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <Car className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-foreground">No drivers are available</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {blocked.length > 0
                      ? `${blocked.length} nearby driver${blocked.length === 1 ? ' is' : 's are'} blocked - show them to see why.`
                      : 'Nobody is online with a GPS fix right now.'}
                  </p>
                </div>
              )}

              {shown.map((candidate, index) => (
                <CandidateRow
                  key={candidate.driverId}
                  candidate={candidate}
                  rank={candidate.isEligible ? index + 1 : null}
                  selected={candidate.driverId === selectedId}
                  onSelect={() => candidate.isEligible && setSelectedId(candidate.driverId)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-4">
              <div className="min-w-0 text-sm">
                {selected ? (
                  <>
                    <p className="truncate font-medium text-foreground">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.distanceKm != null ? `${selected.distanceKm} km` : 'Distance unknown'}
                      {selected.etaMinutes != null ? ` · ~${selected.etaMinutes} min away` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Pick a driver from the map or the list</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!selected || assigning}
                  onClick={assign}
                >
                  {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  candidate,
  rank,
  selected,
  onSelect,
}: {
  candidate: AssignmentCandidate;
  rank: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = !candidate.isEligible;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
          : disabled
          ? 'cursor-not-allowed border-border/60 bg-muted/30 opacity-70'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Initials name={candidate.name} className="h-10 w-10 text-xs" />
          {rank != null && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white ring-2 ring-background">
              {rank}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium text-foreground">{candidate.name}</p>
            {candidate.distanceKm != null && (
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {candidate.distanceKm} km
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {candidate.vehicleType} · {candidate.vehiclePlate}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {candidate.etaMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3 w-3" />~{candidate.etaMinutes} min
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Ticket className="h-3 w-3" />
              <span className="tabular-nums">{candidate.couponBalance}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span className="tabular-nums">{candidate.rating?.toFixed(1) ?? '-'}</span>
            </span>
            {candidate.phoneNumber && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {candidate.phoneNumber}
              </span>
            )}
          </div>

          {disabled && candidate.blockedReason && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive">
              <Ban className="h-3 w-3" />
              {candidate.blockedReason}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
