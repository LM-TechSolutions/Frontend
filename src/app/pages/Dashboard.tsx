import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, MapPin, Navigation, Phone, Eye, Loader2, Bell, Clock, Car, Users, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { rideStatusLabel } from '../lib/format';
import GebetaMapView from '../components/GebetaMapView';
import LogCallDialog from '../components/LogCallDialog';
import NewRideDialog from '../components/NewRideDialog';
import AssignFromMapDialog from '../components/AssignFromMapDialog';
import { useAppContext } from '../contexts/AppContext';
import { StatTile, EmptyState } from '../components/coupons/CouponAtoms';
import { StatusBadge, waitTone } from '../components/layout/StatusBadge';

const ACTIVE_STATUSES = ['dispatched', 'accepted', 'arrived', 'in_progress'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useAppContext();
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [redispatchingId, setRedispatchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ridesRes, driversRes] = await Promise.all([
      api.rides.list({ limit: 50 }),
      api.drivers.list({ limit: 100 }),
    ]);
    return { rides: ridesRes.rides ?? [], drivers: driversRes.drivers ?? [] };
  }, []);

  const { data, loading, reload } = useRealtimeCollection({
    load,
    subscribeMap: true,
    events: [
      'ride:created',
      'ride:status',
      'ride:completed',
      'ride:accepted',
      'ride:arrived',
      'ride:started',
      'ride:cancelled',
      'coupon:low',
      'coupon:empty',
      'system:alert',
      'driver:status',
      'driver:approved',
      'driver:location',
    ],
    refetchEvents: ['driver:approved', 'coupon:low', 'coupon:empty', 'system:alert'],
    apply: (prev, event, payload) => {
      if (event === 'driver:location') {
        if (!payload?.driverId || typeof payload.latitude !== 'number') return prev;
        return {
          ...prev,
          drivers: prev.drivers.map((d: any) =>
            d.id === payload.driverId ? { ...d, currentLocation: { lat: payload.latitude, lng: payload.longitude } } : d
          ),
        };
      }
      if (event === 'ride:created') {
        const rideId = payload?.id ?? payload?.rideId;
        if (!rideId) return prev;
        if (prev.rides.some((r: any) => r.id === rideId)) return prev;
        return { ...prev, rides: [{ ...payload, id: rideId, status: payload.status ?? 'pending' }, ...prev.rides] };
      }
      if (event.startsWith('ride:') && payload?.rideId) {
        return {
          ...prev,
          rides: prev.rides.map((r: any) =>
            r.id === payload.rideId ? { ...r, status: payload.status ?? r.status } : r
          ),
        };
      }
      if (event === 'driver:status' && payload?.driverId) {
        return {
          ...prev,
          drivers: prev.drivers.map((d: any) =>
            d.id === payload.driverId ? { ...d, status: payload.status ?? d.status } : d
          ),
        };
      }
      return prev;
    },
  });

  const rides = data?.rides ?? [];
  const drivers = data?.drivers ?? [];

  const pendingRides = rides.filter((r) => r.status === 'pending' || r.status === 'unassigned');
  const activeRides = rides.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const alarmed = pendingRides.filter((r) => waitTone(r.createdAt).alarm);
  const avgWait = useMemo(() => {
    const waits = pendingRides.map((r) => (Date.now() - new Date(r.createdAt).getTime()) / 60000);
    if (!waits.length) return 0;
    return Math.max(1, Math.round(waits.reduce((a, b) => a + b, 0) / waits.length));
  }, [pendingRides]);

  const fleet = useMemo(
    () =>
      drivers
        .filter((d) => d.currentLocation)
        .map((d) => ({
          lng: d.currentLocation.lng,
          lat: d.currentLocation.lat,
          color: d.status === 'available' ? '#0B7A55' : d.status === 'busy' ? '#AE2E2D' : '#6B7280',
        })),
    [drivers]
  );

  const handleRedispatch = async (ride: any) => {
    setRedispatchingId(ride.id);
    try {
      const res = await api.rides.redispatch(ride.id);
      if (res.dispatched) toast.success(`Re-notified ${res.candidates} nearby driver(s)`);
      else toast.warning('No eligible nearby drivers right now');
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to re-notify drivers');
    } finally {
      setRedispatchingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/80 bg-card/70 px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Live board</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t('nav.dashboard', 'Dashboard')}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <LogCallDialog onLogged={reload} className="h-10" />
            <Button className="h-10" onClick={() => setNewRideOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('dashboard.newRide', 'New ride')}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t('dashboard.pendingRides', 'Pending')}
            value={pendingRides.length}
            hint={alarmed.length ? `${alarmed.length} waiting over 8 min` : 'Awaiting a driver'}
            icon={Clock}
            accent={alarmed.length ? '#AE2E2D' : '#B4560B'}
          />
          <StatTile
            label={t('dashboard.activeRides', 'Active')}
            value={activeRides.length}
            hint="On the road now"
            icon={Car}
          />
          <StatTile
            label={t('dashboard.available', 'Available drivers')}
            value={availableDrivers.length}
            hint={`${drivers.length} in the fleet`}
            icon={Users}
            accent="#0B7A55"
          />
          <StatTile
            label="Avg wait"
            value={pendingRides.length ? `${avgWait}m` : '-'}
            hint={pendingRides.length ? 'Across unassigned rides' : 'No queue'}
            icon={AlertTriangle}
            accent={avgWait >= 8 ? '#AE2E2D' : avgWait >= 3 ? '#B4560B' : '#0B7A55'}
          />
        </div>
        {alarmed.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">{alarmed.length} unassigned ride{alarmed.length === 1 ? '' : 's'}</span>{' '}
              have waited more than 8 minutes. Assign or re-notify now.
            </p>
          </div>
        )}
      </div>

      <NewRideDialog open={newRideOpen} onOpenChange={setNewRideOpen} onCreated={reload} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 overflow-auto border-b border-border bg-background lg:w-[38%] lg:border-b-0 lg:border-r">
          <div className="space-y-6 p-4 sm:p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <section>
                  <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
                    {t('dashboard.pendingRides', 'Pending rides')} ({pendingRides.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingRides.map((ride) => {
                      const wait = waitTone(ride.createdAt);
                      return (
                        <article
                          key={ride.id}
                          className={`rounded-2xl border bg-card p-4 shadow-[0_1px_0_rgba(255,255,255,.55),0_18px_40px_-28px_rgba(5,50,54,.35)] ${
                            wait.alarm ? 'border-destructive/30' : 'border-border/80'
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-card-foreground">{ride.customerName}</p>
                              <a
                                href={`tel:${ride.customerPhone}`}
                                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Phone className="h-3 w-3" /> {ride.customerPhone}
                              </a>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
                              <span className={`text-[12px] font-medium ${wait.className}`}>
                                {wait.label}
                              </span>
                            </div>
                          </div>
                          <div className="mb-3 space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0B7A55]" />
                              <span className="text-muted-foreground">{ride.pickupLocation}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-[#AE2E2D]" />
                              <span className="text-muted-foreground">{ride.dropoffLocation}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/rides/${ride.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> {t('dashboard.track', 'Track')}
                            </Button>
                            <Button className="flex-1" size="sm" onClick={() => setAssignFor(ride)}>
                              {t('dashboard.assign', 'Assign')}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => handleRedispatch(ride)}
                            disabled={redispatchingId === ride.id}
                          >
                            {redispatchingId === ride.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Bell className="mr-2 h-4 w-4" />
                            )}
                            {t('dashboard.reNotifyDrivers', 'Re-notify drivers')}
                          </Button>
                        </article>
                      );
                    })}
                    {pendingRides.length === 0 && (
                      <EmptyState icon={Clock} title={t('dashboard.noPendingRides', 'No pending rides')} />
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
                    {t('dashboard.activeRides', 'Active rides')} ({activeRides.length})
                  </h3>
                  <div className="space-y-3">
                    {activeRides.map((ride) => (
                      <article key={ride.id} className="rounded-2xl border border-border/80 bg-card p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-card-foreground">{ride.customerName}</p>
                            <p className="text-sm text-muted-foreground">Driver: {ride.driverName ?? '-'}</p>
                          </div>
                          <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/rides/${ride.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> {t('dashboard.viewDetails', 'View details')}
                        </Button>
                      </article>
                    ))}
                    {activeRides.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">{t('dashboard.noActiveRides', 'No active rides')}</p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <div className="relative min-h-[320px] flex-1">
          <GebetaMapView fleet={fleet} height="100%" zoom={12} className="h-full w-full" />
          <div className="absolute right-4 top-4 z-[400] rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-card-foreground">{t('dashboard.driverStatus', 'Driver status')}</h4>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('dashboard.live', 'Live')}</span>
            </div>
            <div className="space-y-2 text-xs text-card-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#0B7A55]" />
                <span>
                  {t('dashboard.available', 'Available')} ({drivers.filter((d) => d.status === 'available').length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#AE2E2D]" />
                <span>
                  {t('dashboard.busy', 'Busy')} ({drivers.filter((d) => d.status === 'busy').length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#6B7280]" />
                <span>
                  {t('dashboard.offline', 'Offline')} ({drivers.filter((d) => d.status === 'offline').length})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssignFromMapDialog ride={assignFor} onClose={() => setAssignFor(null)} onAssigned={reload} />
    </div>
  );
}
