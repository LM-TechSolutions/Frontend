import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Navigation,
  Loader2,
  Copy,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';
import { connectSocket, subscribeRide, unsubscribeRide, subscribeMap, unsubscribeMap } from '../lib/socket';
import { rideStatusLabel, formatETB, formatDateTime, shortId } from '../lib/format';
import type { RoadRoute } from '../lib/route';
import GebetaMapView, { type MapPoint } from '../components/GebetaMapView';
import AssignFromMapDialog from '../components/AssignFromMapDialog';
import { useAppContext } from '../contexts/AppContext';
import { StatusBadge, waitTone } from '../components/layout/StatusBadge';
import { Initials } from '../components/coupons/CouponAtoms';
import { Surface } from '../components/layout/PageHeader';
import { cn } from '../components/ui/utils';
import { ErrorPage } from './ErrorPage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const STAGES = ['pending', 'dispatched', 'accepted', 'arrived', 'in_progress', 'completed'];
const OPEN_STATUSES = ['pending', 'unassigned', 'dispatched', 'accepted', 'arrived', 'in_progress'];
const REDISPATCH_STATUSES = ['pending', 'unassigned', 'dispatched'];

function copyText(value: string, label: string, copied: string, failed: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(copied),
    () => toast.error(failed)
  );
}

function gpsFreshness(
  at: Date | null,
  now: number,
  t: (path: string, fallback?: string, params?: Record<string, string | number>) => string
) {
  if (!at) return null;
  const seconds = Math.max(0, Math.round((now - at.getTime()) / 1000));
  if (seconds < 8) return { label: t('common.live'), live: true };
  if (seconds < 60) return { label: t('rides.secondsAgo', undefined, { s: seconds }), live: false };
  return { label: t('rides.minutesAgo', undefined, { m: Math.floor(seconds / 60) }), live: false };
}

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const [ride, setRide] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<MapPoint | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [redispatching, setRedispatching] = useState(false);
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [mapFs, setMapFs] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const rideIdRef = useRef(rideId);
  rideIdRef.current = rideId;

  const fetchHistory = async () => {
    if (!rideId) return;
    try {
      const data = await api.rides.history(rideId);
      const rows = Array.isArray(data) ? data : data?.history ?? data?.items ?? [];
      setHistory(
        [...rows].sort(
          (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        )
      );
    } catch {
      setHistory([]);
    }
  };

  const fetchRide = async (silent = false) => {
    if (!rideId) return;
    try {
      const data = await api.rides.get(rideId);
      setRide(data);
      setErrorStatus(null);
      if (data?.currentLocation) {
        setDriverPos({ lng: data.currentLocation.lng, lat: data.currentLocation.lat });
      }
      if (!silent) await fetchHistory();
    } catch (e) {
      if (!silent) {
        setRide(null);
        setErrorStatus(e instanceof ApiError ? e.status : 500);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const socket = connectSocket();
    subscribeRide(rideId);
    subscribeMap();

    const onProgress = (data: any) => {
      if (data?.rideId !== rideIdRef.current) return;
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setDriverPos({ lng: data.longitude, lat: data.latitude });
        setLastPing(new Date());
      }
    };
    const onStatus = (data: any) => {
      if (data?.rideId !== rideIdRef.current) return;
      setRide((prev: any) => (prev ? { ...prev, status: data.status } : prev));
      void fetchRide(true);
      void fetchHistory();
    };

    socket.on('ride:progress', onProgress);
    socket.on('ride:status', onStatus);
    socket.on('ride:accepted', onStatus);
    socket.on('ride:arrived', onStatus);
    socket.on('ride:started', onStatus);
    socket.on('ride:completed', onStatus);
    socket.on('ride:cancelled', onStatus);

    return () => {
      socket.off('ride:progress', onProgress);
      socket.off('ride:status', onStatus);
      socket.off('ride:accepted', onStatus);
      socket.off('ride:arrived', onStatus);
      socket.off('ride:started', onStatus);
      socket.off('ride:completed', onStatus);
      socket.off('ride:cancelled', onStatus);
      unsubscribeRide(rideId);
      unsubscribeMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  useEffect(() => {
    if (!lastPing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastPing]);

  const handleCancel = async () => {
    if (!rideId) return;
    setCancelling(true);
    try {
      await api.rides.cancel(rideId, t('rides.cancelledByCallCenter'));
      toast.success(t('rides.cancelled'));
      setCancelOpen(false);
      void fetchRide();
    } catch (e: any) {
      toast.error(e?.message ?? t('rides.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  const handleRedispatch = async () => {
    if (!rideId) return;
    setRedispatching(true);
    try {
      const res = await api.rides.redispatch(rideId);
      toast.success(
        res.candidates > 0
          ? t('rides.notifiedNearby', undefined, { count: res.candidates })
          : t('rides.noNearby')
      );
    } catch (e: any) {
      toast.error(e?.message ?? t('rides.redispatchFailed'));
    } finally {
      setRedispatching(false);
    }
  };

  const pickup: MapPoint | null = ride?.pickupCoordinates
    ? { lng: ride.pickupCoordinates.lng, lat: ride.pickupCoordinates.lat }
    : null;
  const dropoff: MapPoint | null = ride?.dropoffCoordinates
    ? { lng: ride.dropoffCoordinates.lng, lat: ride.dropoffCoordinates.lat }
    : null;
  const hasDriver = !!ride?.driverId;
  const isOpen = ride ? OPEN_STATUSES.includes(ride.status) : false;
  const canAssign = isOpen;
  const canRedispatch = ride ? REDISPATCH_STATUSES.includes(ride.status) : false;
  const displayDistanceKm = roadRoute?.distanceKm ?? (ride?.distance != null ? Number(ride.distance) : null);
  const displayDurationMin = roadRoute?.durationMinutes ?? ride?.duration ?? null;
  const wait = ride && REDISPATCH_STATUSES.includes(ride.status) ? waitTone(ride.createdAt) : null;
  const ping = gpsFreshness(lastPing, now, t);
  const stageIndex = ride ? STAGES.indexOf(ride.status) : -1;
  const events = useMemo(() => history, [history]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ride) {
    return <ErrorPage status={errorStatus && errorStatus >= 400 ? errorStatus : 404} />;
  }

  return (
    <div className="flex min-h-[calc(100svh-4.25rem)] flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate('/rides')} aria-label={t('rides.backToRides')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="truncate font-display text-2xl font-semibold tracking-tight">{ride.customerName}</h2>
              <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
              {wait && (
                <span className={cn('text-sm font-medium', wait.className)}>
                  {wait.minutes >= 3
                    ? t('common.waitingMinutes', undefined, { m: wait.minutes })
                    : t('common.waitingShort', undefined, { m: wait.minutes })}
                </span>
              )}
            </div>
            <button
              type="button"
              className="mt-1 font-mono text-xs text-muted-foreground hover:text-foreground"
              onClick={() => copyText(ride.id, 'Ride ID', t('common.copied', undefined, { label: t('rides.rideID') }), t('common.copyFailed'))}
            >
              #{shortId(ride.id)}
              <Copy className="ml-1.5 inline h-3 w-3 align-[-1px]" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ride.customerPhone && (
            <Button variant="outline" asChild>
              <a href={`tel:${ride.customerPhone}`}>
                <Phone className="mr-2 h-4 w-4" /> {t('common.call')}
              </a>
            </Button>
          )}
          {canRedispatch && (
            <Button variant="outline" onClick={() => void handleRedispatch()} disabled={redispatching}>
              {redispatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              {t('rides.reNotify')}
            </Button>
          )}
          {canAssign && (
            <Button onClick={() => setAssignOpen(true)}>{hasDriver ? t('rides.reassign') : t('dashboard.assign')}</Button>
          )}
          {isOpen && (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setCancelOpen(true)}
            >
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Surface className="relative h-[50vh] min-h-[320px] overflow-hidden lg:h-full lg:min-h-0">
          <GebetaMapView
            pickup={pickup}
            dropoff={dropoff}
            driver={driverPos}
            driverName={ride.driverName}
            driverPhoto={ride.driverPhoto}
            driverStatus={rideStatusLabel(ride.status)}
            driverDetail={[ride.licensePlate, ride.vehicleInfo].filter(Boolean).join(' · ') || undefined}
            height="100%"
            autoRoadRoute
            onRouteResolved={setRoadRoute}
            className="h-full w-full !rounded-none"
            fullscreen={mapFs}
            onFullscreenChange={setMapFs}
            overlay={
              <>
                <div className="pointer-events-none absolute bottom-3 left-3 right-14 flex items-end justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-full border border-border/70 bg-card/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-sm backdrop-blur',
                      ping?.live ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {ping?.label ?? (hasDriver ? t('rides.waitingGps') : t('rides.noDriverYet'))}
                  </span>
                  {(displayDistanceKm != null || displayDurationMin != null) && (
                    <span className="rounded-full border border-border/70 bg-card/95 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                      {displayDistanceKm != null ? t('rides.kmValue', undefined, { n: Number(displayDistanceKm).toFixed(1) }) : ''}
                      {displayDistanceKm != null && displayDurationMin != null ? ' · ' : ''}
                      {displayDurationMin != null ? t('rides.minApprox', undefined, { n: displayDurationMin }) : ''}
                    </span>
                  )}
                </div>
                {mapFs && (
                  <div className="pointer-events-auto absolute left-3 top-3 flex max-w-[min(100%-4.5rem,36rem)] flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/95 px-3 py-2 shadow-md backdrop-blur">
                    <p className="truncate text-sm font-semibold">{ride.customerName}</p>
                    <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
                    {ride.customerPhone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${ride.customerPhone}`}>
                          <Phone className="mr-1.5 h-3.5 w-3.5" /> {t('common.call')}
                        </a>
                      </Button>
                    )}
                    {ride.driverPhone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${ride.driverPhone}`}>
                          <Phone className="mr-1.5 h-3.5 w-3.5" /> {t('common.driver')}
                        </a>
                      </Button>
                    )}
                    {canRedispatch && (
                      <Button size="sm" variant="outline" onClick={() => void handleRedispatch()} disabled={redispatching}>
                        {redispatching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1.5 h-3.5 w-3.5" />}
                        {t('rides.reNotify')}
                      </Button>
                    )}
                    {canAssign && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setMapFs(false);
                          setAssignOpen(true);
                        }}
                      >
                        {hasDriver ? t('rides.reassign') : t('dashboard.assign')}
                      </Button>
                    )}
                    {isOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => {
                          setMapFs(false);
                          setCancelOpen(true);
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    )}
                  </div>
                )}
              </>
            }
          />
        </Surface>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
          {stageIndex >= 0 && (
            <Surface className="p-4">
              <div className="flex gap-1">
                {STAGES.map((stage, i) => (
                  <div
                    key={stage}
                    title={rideStatusLabel(stage)}
                    className={cn('h-1.5 flex-1 rounded-full', i <= stageIndex ? 'bg-primary' : 'bg-border')}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm font-medium">{rideStatusLabel(ride.status)}</p>
            </Surface>
          )}

          <Surface className="grid grid-cols-3 divide-x divide-border/70">
            <StatCell
              label={ride.status === 'completed' ? t('rides.finalFare', 'Fare') : t('rides.fare', 'Fare')}
              value={formatETB(ride.fare)}
            />
            <StatCell
              label={t('rides.distance')}
              value={displayDistanceKm != null ? t('rides.kmValue', undefined, { n: Number(displayDistanceKm).toFixed(1) }) : '-'}
            />
            <StatCell
              label={t('rides.eta')}
              value={displayDurationMin != null ? t('rides.minValue', undefined, { n: displayDurationMin }) : '-'}
            />
          </Surface>

          {ride.status === 'completed' && (ride.fare != null || ride.commissionAmount != null || ride.driverEarnings != null) && (
            <Surface className="space-y-3 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('rides.settlement')}
              </p>
              <SettlementRow label={t('rides.passengerFare')} value={formatETB(ride.fare)} />
              <SettlementRow
                label={t('rides.tekummaCommission')}
                hint={
                  ride.commissionPercent
                    ? t('rides.commissionPaidInCouponsPct', undefined, { percent: ride.commissionPercent })
                    : t('rides.commissionPaidInCoupons')
                }
                value={ride.commissionAmount != null ? `− ${formatETB(ride.commissionAmount)}` : '-'}
                tone="warn"
              />
              <SettlementRow
                label={t('rides.driverKeeps')}
                value={formatETB(ride.driverEarnings ?? (ride.fare != null && ride.commissionAmount != null ? ride.fare - ride.commissionAmount : ride.fare))}
                emphasise
              />
            </Surface>
          )}

          <Surface className="space-y-3 p-4">
            <StopRow tone="pickup" label={t('rides.pickup', 'Pickup')} value={ride.pickupLocation} />
            <StopRow tone="drop" label={t('rides.destination', 'Drop-off')} value={ride.dropoffLocation} />
          </Surface>

          <Surface className="p-4">
            {hasDriver ? (
              <div className="flex items-start gap-3">
                <Initials name={ride.driverName ?? t('common.driver')} src={ride.driverPhoto} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ride.driverName}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{ride.licensePlate ?? '-'}</p>
                  {ride.vehicleInfo && <p className="text-xs text-muted-foreground">{ride.vehicleInfo}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ride.driverPhone && (
                      <Button size="sm" asChild>
                        <a href={`tel:${ride.driverPhone}`}>
                          <Phone className="mr-1.5 h-3.5 w-3.5" /> {t('common.call')}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/employees/${ride.driverId}`)}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t('common.profile')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{t('rides.noDriver')}</p>
                  <p className="text-sm text-muted-foreground">{t('rides.assignFromMap')}</p>
                </div>
                {canAssign && (
                  <Button size="sm" onClick={() => setAssignOpen(true)}>
                    {t('dashboard.assign', 'Assign')}
                  </Button>
                )}
              </div>
            )}
          </Surface>

          <Surface className="p-4">
            <div className="flex items-start gap-3">
              <Initials name={ride.customerName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{ride.customerName}</p>
                {ride.customerPhone ? (
                  <div className="mt-1 flex items-center gap-2">
                    <a href={`tel:${ride.customerPhone}`} className="text-sm text-primary hover:underline">
                      {ride.customerPhone}
                    </a>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t('rides.copyPhone')}
                      onClick={() => copyText(ride.customerPhone, 'Phone', t('common.copied', undefined, { label: t('common.phone') }), t('common.copyFailed'))}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(ride.createdAt)}</p>
              </div>
            </div>
          </Surface>

          <Surface className="p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('rides.timeline')}</p>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('rides.noEvents')}</p>
            ) : (
              <ol className="space-y-0">
                {events.map((event, index) => (
                  <li key={event.id ?? index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'mt-1 h-2.5 w-2.5 rounded-full',
                          index === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-sidebar'
                        )}
                      />
                      {index < events.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className={cn(index < events.length - 1 && 'pb-4')}>
                      <p className="text-sm font-semibold">{rideStatusLabel(event.toStatus ?? event.status)}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.createdAt ? formatDateTime(event.createdAt) : '-'}
                        {event.actorType ? ` · ${event.actorType}` : ''}
                      </p>
                      {event.notes && <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Surface>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rides.cancelThisRide')}</AlertDialogTitle>
            <AlertDialogDescription>{t('rides.cancelNotify')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t('rides.keepRide')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : t('rides.cancelRide')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignFromMapDialog ride={assignOpen ? ride : null} onClose={() => setAssignOpen(false)} onAssigned={() => fetchRide()} />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SettlementRow({
  label,
  value,
  hint,
  tone,
  emphasise,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'warn';
  emphasise?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cn('text-sm', emphasise ? 'font-semibold' : 'text-muted-foreground')}>{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <p
        className={cn(
          'shrink-0 text-sm tabular-nums',
          emphasise ? 'font-semibold' : 'font-medium',
          tone === 'warn' ? 'text-amber-700 dark:text-amber-400' : ''
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StopRow({ tone, label, value }: { tone: 'pickup' | 'drop'; label: string; value?: string | null }) {
  const Icon = tone === 'pickup' ? MapPin : Navigation;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'pickup' ? 'text-[color:var(--success)]' : 'text-destructive')} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium leading-5">{value || '-'}</p>
      </div>
    </div>
  );
}
