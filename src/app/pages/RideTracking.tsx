import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Phone, X, MapPin, Navigation, User, Car, Clock, Loader2, Route } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, subscribeRide, unsubscribeRide } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import type { RoadRoute } from '../lib/route';
import GebetaMapView, { type MapPoint } from '../components/GebetaMapView';
import { useAppContext } from '../contexts/AppContext';

const rideStatuses = ['pending', 'dispatched', 'accepted', 'arrived', 'in_progress', 'completed'];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-[#F59E0B]',
    dispatched: 'bg-[#00BDC3]',
    accepted: 'bg-[#00BDC3]',
    arrived: 'bg-[#00BDC3]',
    in_progress: 'bg-[#00BDC3]',
    completed: 'bg-[#10B981]',
    cancelled: 'bg-[#EF4444]',
  };
  return colors[status] || 'bg-gray-500';
};

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<MapPoint | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const rideIdRef = useRef(rideId);
  rideIdRef.current = rideId;

  const fetchRide = async (silent = false) => {
    if (!rideId) return;
    try {
      const data = await api.rides.get(rideId);
      setRide(data);
      if (data?.currentLocation) {
        setDriverPos({ lng: data.currentLocation.lng, lat: data.currentLocation.lat });
      }
    } catch {
      if (!silent) setRide(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRide();
    const poll = setInterval(() => fetchRide(true), 12000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const socket = connectSocket();
    subscribeRide(rideId);

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
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00BDC3]" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('rides.rideNotFound', 'Ride not found')}</p>
          <Button onClick={() => navigate('/rides')} className="mt-4 bg-[#00BDC3] hover:bg-[#009EA3] text-white">
            {t('rides.backToDashboard', 'Back to Rides')}
          </Button>
        </div>
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
  const displayDistanceKm =
    roadRoute?.distanceKm ?? (ride.distance != null ? Number(ride.distance) : null);
  const displayDurationMin = roadRoute?.durationMinutes ?? null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rides')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t('rides.rideTitle', 'Ride #{0}', { 0: String(ride.id).slice(0, 8) })}</h2>
            <p className="text-muted-foreground">{t('rides.subtitle', 'Track ride progress in real-time')}</p>
          </div>
        </div>
        <Badge className={`${getStatusColor(ride.status)} text-white text-base px-4 py-2`}>
          {rideStatusLabel(ride.status)}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('rides.rideProgress', 'Ride Progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {rideStatuses.map((status, index) => {
              const isPast = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              return (
                <div key={status} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                        isPast
                          ? 'bg-[#00BDC3] border-[#00BDC3] text-white'
                          : 'bg-card border-border text-muted-foreground'
                      } ${isCurrent ? 'ring-4 ring-[#00BDC3]/30 scale-110' : ''}`}
                    >
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <p className={`mt-2 text-sm font-medium text-center ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {rideStatusLabel(status)}
                    </p>
                  </div>
                  {index < rideStatuses.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 mt-[-30px] ${index < currentStatusIndex ? 'bg-[#00BDC3]' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#00BDC3]" /> {t('rides.customerInformation', 'Customer Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('rides.name', 'Name')}</p>
              <p className="font-semibold text-card-foreground">{ride.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
              <p className="font-semibold text-card-foreground">{ride.customerPhone}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#10B981] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('rides.pickup', 'Pickup')}</p>
                  <p className="text-sm font-medium text-card-foreground">{ride.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-[#EF4444] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('rides.destination', 'Destination')}</p>
                  <p className="text-sm font-medium text-card-foreground">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-[#00BDC3]" /> {t('rides.driverInformation', 'Driver Information')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDriver ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('rides.driverName', 'Driver Name')}</p>
                  <p className="font-semibold text-card-foreground">{ride.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('rides.phoneNumber', 'Phone Number')}</p>
                  <p className="font-semibold text-card-foreground">{ride.driverPhone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('rides.vehicle', 'Vehicle')}</p>
                  <p className="font-semibold text-card-foreground">{ride.vehicleInfo ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('rides.licensePlate', 'License Plate')}</p>
                  <p className="font-semibold text-card-foreground">{ride.licensePlate ?? '—'}</p>
                </div>
                {ride.driverPhone && (
                  <Button className="w-full bg-[#00BDC3] hover:bg-[#009EA3] text-white" asChild>
                    <a href={`tel:${ride.driverPhone}`}>
                      <Phone className="w-4 h-4 mr-2" /> {t('rides.callDriver', 'Call Driver')}
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('rides.noDriverAssigned', 'No driver assigned yet')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00BDC3]" /> {t('rides.rideDetails', 'Ride Details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('rides.rideIdLabel', 'Ride ID')}</p>
              <p className="font-semibold text-card-foreground">#{String(ride.id).slice(0, 8)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('rides.createdAt', 'Created')}</p>
                <p className="font-semibold text-card-foreground">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('rides.updated', 'Updated')}</p>
                <p className="font-semibold text-card-foreground">{format(new Date(ride.updatedAt), 'MMM dd, HH:mm')}</p>
              </div>
            </div>
            {displayDistanceKm != null && (
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-[#00BDC3]" />
                <div>
                  <p className="text-sm text-muted-foreground mb-0.5">{t('rides.roadDistance', 'Road distance')}</p>
                  <p className="font-semibold text-card-foreground">
                    {Number(displayDistanceKm).toFixed(2)} km
                    {displayDurationMin != null ? ` · ~${displayDurationMin} min` : ''}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">{ride.status === 'completed' ? t('rides.finalFare', 'Final Fare') : t('rides.fare', 'Fare')}</p>
              <p className="text-2xl font-bold text-[#00BDC3]">{formatETB(ride.fare)}</p>
            </div>
            <Separator />
            {ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
              >
                {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                {t('rides.cancelRide', 'Cancel Ride')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('rides.liveTracking', 'Live Tracking')}</CardTitle>
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
    </div>
  );
}
