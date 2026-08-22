import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Phone, X, MapPin, Navigation, User, Car, Clock, Loader2, Route, Ticket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, subscribeRide, unsubscribeRide, subscribeMap, unsubscribeMap } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import type { RoadRoute } from '../lib/route';
import GebetaMapView, { type MapPoint } from '../components/GebetaMapView';
import AssignFromMapDialog from '../components/AssignFromMapDialog';
import { useAppContext } from '../contexts/AppContext';
import { StatusBadge } from '../components/layout/StatusBadge';
import { EmptyState } from '../components/coupons/CouponAtoms';

const rideStatuses = ['pending', 'dispatched', 'accepted', 'arrived', 'in_progress', 'completed'];

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const [ride, setRide] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<MapPoint | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const rideIdRef = useRef(rideId);
  rideIdRef.current = rideId;

  const fetchHistory = async () => {
    if (!rideId) return;
    try {
      const data = await api.rides.history(rideId);
      const rows = Array.isArray(data) ? data : data?.history ?? data?.items ?? [];
      setHistory(rows);
    } catch {
      setHistory([]);
    }
  };

  const fetchRide = async (silent = false) => {
    if (!rideId) return;
    try {
      const data = await api.rides.get(rideId);
      setRide(data);
      if (data?.currentLocation) {
        setDriverPos({ lng: data.currentLocation.lng, lat: data.currentLocation.lat });
      }
      if (!silent) await fetchHistory();
    } catch {
      if (!silent) setRide(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRide();
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
      }
    };
    const onStatus = (data: any) => {
      if (data?.rideId !== rideIdRef.current) return;
      setRide((prev: any) => (prev ? { ...prev, status: data.status } : prev));
      fetchRide(true);
      fetchHistory();
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

  const handleCancel = async () => {
    if (!rideId) return;
    setCancelling(true);
    try {
      await api.rides.cancel(rideId, 'Cancelled by call center');
      toast.success('Ride cancelled');
      fetchRide();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to cancel ride');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Car}
          title={t('rides.rideNotFound', 'Ride not found')}
          action={
            <Button onClick={() => navigate('/rides')}>
              {t('rides.backToDashboard', 'Back to rides')}
            </Button>
          }
        />
      </div>
    );
  }

  const currentStatusIndex = rideStatuses.indexOf(ride.status);
  const pickup: MapPoint | null = ride.pickupCoordinates
    ? { lng: ride.pickupCoordinates.lng, lat: ride.pickupCoordinates.lat }
    : null;
  const dropoff: MapPoint | null = ride.dropoffCoordinates
    ? { lng: ride.dropoffCoordinates.lng, lat: ride.dropoffCoordinates.lat }
    : null;
  const hasDriver = !!ride.driverId;
  const displayDistanceKm = roadRoute?.distanceKm ?? (ride.distance != null ? Number(ride.distance) : null);
  const displayDurationMin = roadRoute?.durationMinutes ?? ride.duration ?? null;
  const canAssign = !['completed', 'cancelled'].includes(ride.status);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rides')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Live tracking</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t('rides.rideTitle', 'Ride #{0}', { 0: String(ride.id).slice(0, 8) })}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
          {canAssign && (
            <Button onClick={() => setAssignOpen(true)}>
              {hasDriver ? 'Reassign' : t('dashboard.assign', 'Assign')}
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80">
        <CardHeader>
          <CardTitle>{t('rides.rideProgress', 'Ride progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <ol className="space-y-0">
              {history.map((event, index) => (
                <li key={event.id ?? index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-3 w-3 rounded-full ${
                        index === history.length - 1 ? 'bg-primary ring-4 ring-primary/20' : 'bg-sidebar'
                      }`}
                    />
                    {index < history.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold">{rideStatusLabel(event.toStatus ?? event.status)}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.createdAt ? format(new Date(event.createdAt), 'MMM dd, HH:mm') : ''}
                      {event.actorType ? ` · ${event.actorType}` : ''}
                    </p>
                    {event.notes && <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex items-center justify-between">
              {rideStatuses.map((status, index) => {
                const isPast = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                return (
                  <div key={status} className="flex flex-1 items-center">
                    <div className="flex flex-1 flex-col items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-4 ${
                          isPast ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground'
                        } ${isCurrent ? 'scale-110 ring-4 ring-primary/30' : ''}`}
                      >
                        <span className="font-bold">{index + 1}</span>
                      </div>
                      <p className={`mt-2 text-center text-sm font-medium ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {rideStatusLabel(status)}
                      </p>
                    </div>
                    {index < rideStatuses.length - 1 && (
                      <div className={`mx-2 mt-[-30px] h-1 flex-1 ${index < currentStatusIndex ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> {t('rides.customerInformation', 'Customer')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{t('rides.name', 'Name')}</p>
              <p className="font-semibold">{ride.customerName}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Phone</p>
              <a href={`tel:${ride.customerPhone}`} className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
                <Phone className="h-4 w-4" /> {ride.customerPhone}
              </a>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[color:var(--success)]" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('rides.pickup', 'Pickup')}</p>
                  <p className="text-sm font-medium">{ride.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-1 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('rides.destination', 'Destination')}</p>
                  <p className="text-sm font-medium">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" /> {t('rides.driverInformation', 'Driver')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDriver ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">{t('rides.driverName', 'Driver name')}</p>
                  <p className="font-semibold">{ride.driverName}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">{t('rides.phoneNumber', 'Phone')}</p>
                  <p className="font-semibold">{ride.driverPhone ?? '-'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">{t('rides.vehicle', 'Vehicle')}</p>
                  <p className="font-semibold">{ride.vehicleInfo ?? '-'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">{t('rides.licensePlate', 'License plate')}</p>
                  <p className="font-mono font-semibold">{ride.licensePlate ?? '-'}</p>
                </div>
                {ride.driverPhone && (
                  <Button className="w-full" asChild>
                    <a href={`tel:${ride.driverPhone}`}>
                      <Phone className="mr-2 h-4 w-4" /> {t('rides.callDriver', 'Call driver')}
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="mb-3 text-muted-foreground">{t('rides.noDriverAssigned', 'No driver assigned yet')}</p>
                <Button onClick={() => setAssignOpen(true)}>
                  Assign from map
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> {t('rides.rideDetails', 'Ride details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{t('rides.rideIdLabel', 'Ride ID')}</p>
              <p className="font-mono font-semibold">#{String(ride.id).slice(0, 8)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">{t('rides.createdAt', 'Created')}</p>
                <p className="font-semibold">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">{t('rides.updated', 'Updated')}</p>
                <p className="font-semibold">{format(new Date(ride.updatedAt), 'MMM dd, HH:mm')}</p>
              </div>
            </div>
            {displayDistanceKm != null && (
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <div>
                  <p className="mb-0.5 text-sm text-muted-foreground">{t('rides.roadDistance', 'Road distance')}</p>
                  <p className="font-semibold">
                    {Number(displayDistanceKm).toFixed(2)} km
                    {displayDurationMin != null ? ` · ~${displayDurationMin} min ETA` : ''}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm text-muted-foreground">
                {ride.status === 'completed' ? t('rides.finalFare', 'Final fare') : t('rides.fare', 'Fare')}
              </p>
              <p className="text-2xl font-bold text-primary">{formatETB(ride.fare)}</p>
            </div>
            {(ride.couponDeduction != null || ride.couponsUsed != null) && (
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                <Ticket className="h-4 w-4 text-primary" />
                {ride.couponDeduction ?? ride.couponsUsed} coupons on this trip
              </div>
            )}
            <Separator />
            {ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
              >
                {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                {t('rides.cancelRide', 'Cancel ride')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80">
        <CardHeader>
          <CardTitle>{t('rides.liveTracking', 'Live tracking')}</CardTitle>
        </CardHeader>
        <CardContent>
          <GebetaMapView
            pickup={pickup}
            dropoff={dropoff}
            driver={driverPos}
            height={420}
            autoRoadRoute
            onRouteResolved={setRoadRoute}
          />
        </CardContent>
      </Card>

      <AssignFromMapDialog ride={assignOpen ? ride : null} onClose={() => setAssignOpen(false)} onAssigned={() => fetchRide()} />
    </div>
  );
}
