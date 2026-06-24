import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Phone, X, MapPin, Navigation, User, Car, Clock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, subscribeRide, unsubscribeRide } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import GebetaMapView, { type MapPoint } from '../components/GebetaMapView';

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

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<MapPoint | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const rideIdRef = useRef(rideId);
  rideIdRef.current = rideId;

  const fetchRide = async () => {
    if (!rideId) return;
    try {
      const data = await api.rides.get(rideId);
      setRide(data);
      if (data?.currentLocation) setDriverPos({ lng: data.currentLocation.lng, lat: data.currentLocation.lat });
    } catch {
      setRide(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  // Live updates over WebSockets.
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
      fetchRide();
    };

    socket.on('ride:progress', onProgress);
    socket.on('ride:status', onStatus);
    socket.on('ride:accepted', onStatus);
    socket.on('ride:completed', onStatus);
    socket.on('ride:cancelled', onStatus);

    return () => {
      socket.off('ride:progress', onProgress);
      socket.off('ride:status', onStatus);
      socket.off('ride:accepted', onStatus);
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
          <p className="text-[#6B7280]">Ride not found</p>
          <Button onClick={() => navigate('/rides')} className="mt-4 bg-[#00BDC3] hover:bg-[#009EA3] text-white">
            Back to Rides
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rides')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">Ride #{String(ride.id).slice(0, 8)}</h2>
            <p className="text-[#6B7280]">Track ride progress in real-time</p>
          </div>
        </div>
        <Badge className={`${getStatusColor(ride.status)} text-white text-base px-4 py-2`}>
          {rideStatusLabel(ride.status)}
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ride Progress</CardTitle>
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
                        isPast ? 'bg-[#00BDC3] border-[#00BDC3] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      } ${isCurrent ? 'ring-4 ring-[#00BDC3]/30 scale-110' : ''}`}
                    >
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <p className={`mt-2 text-sm font-medium text-center ${isPast ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
                      {rideStatusLabel(status)}
                    </p>
                  </div>
                  {index < rideStatuses.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 mt-[-30px] ${index < currentStatusIndex ? 'bg-[#00BDC3]' : 'bg-[#E5E7EB]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#00BDC3]" /> Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Name</p>
              <p className="font-semibold text-[#111827]">{ride.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Phone Number</p>
              <p className="font-semibold text-[#111827]">{ride.customerPhone}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#10B981] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Pickup</p>
                  <p className="text-sm font-medium text-[#111827]">{ride.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-[#EF4444] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280]">Destination</p>
                  <p className="text-sm font-medium text-[#111827]">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-[#00BDC3]" /> Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDriver ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Driver Name</p>
                  <p className="font-semibold text-[#111827]">{ride.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Phone Number</p>
                  <p className="font-semibold text-[#111827]">{ride.driverPhone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Vehicle</p>
                  <p className="font-semibold text-[#111827]">{ride.vehicleInfo ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">License Plate</p>
                  <p className="font-semibold text-[#111827]">{ride.licensePlate ?? '—'}</p>
                </div>
                {ride.driverPhone && (
                  <Button className="w-full bg-[#00BDC3] hover:bg-[#009EA3] text-white" asChild>
                    <a href={`tel:${ride.driverPhone}`}>
                      <Phone className="w-4 h-4 mr-2" /> Call Driver
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#6B7280]">No driver assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00BDC3]" /> Ride Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Ride ID</p>
              <p className="font-semibold text-[#111827]">#{String(ride.id).slice(0, 8)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Created</p>
                <p className="font-semibold text-[#111827]">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Updated</p>
                <p className="font-semibold text-[#111827]">{format(new Date(ride.updatedAt), 'MMM dd, HH:mm')}</p>
              </div>
            </div>
            {ride.distance != null && (
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Distance</p>
                <p className="font-semibold text-[#111827]">{Number(ride.distance).toFixed(2)} km</p>
              </div>
            )}
            <div>
              <p className="text-sm text-[#6B7280] mb-1">{ride.status === 'completed' ? 'Final Fare' : 'Fare'}</p>
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
                Cancel Ride
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Map */}
      <Card>
        <CardHeader>
          <CardTitle>Live Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <GebetaMapView pickup={pickup} dropoff={dropoff} driver={driverPos} height={420} />
        </CardContent>
      </Card>
    </div>
  );
}
