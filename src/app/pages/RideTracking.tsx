import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Phone, MessageSquare, X, MapPin, Navigation, User, Car, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { mockRides, mockDrivers } from '../data/mockData';
import { RideStatus } from '../types';
import { format } from 'date-fns';

const rideStatuses: RideStatus[] = ['pending', 'dispatched', 'accepted', 'arrived', 'in_progress', 'completed'];

const statusLabels: Record<RideStatus, string> = {
  pending: 'Created',
  dispatched: 'Dispatched',
  accepted: 'Accepted',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const ride = mockRides.find(r => r.id === rideId);
  const driver = ride?.driverId ? mockDrivers.find(d => d.id === ride.driverId) : null;

  if (!ride) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-[#6B7280]">Ride not found</p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-[#00BDC3] hover:bg-[#009EA3] text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = rideStatuses.indexOf(ride.status);

  const getStatusColor = (status: RideStatus) => {
    const colors = {
      pending: 'bg-[#F59E0B]',
      dispatched: 'bg-[#00BDC3]',
      accepted: 'bg-[#00BDC3]',
      arrived: 'bg-[#00BDC3]',
      in_progress: 'bg-[#00BDC3]',
      completed: 'bg-[#10B981]',
      cancelled: 'bg-[#EF4444]'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">Ride #{ride.id}</h2>
            <p className="text-[#6B7280]">Track ride progress in real-time</p>
          </div>
        </div>
        <Badge className={`${getStatusColor(ride.status)} text-white text-base px-4 py-2`}>
          {ride.status.replace('_', ' ').toUpperCase()}
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
                        isPast
                          ? 'bg-[#00BDC3] border-[#00BDC3] text-white'
                          : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      } ${isCurrent ? 'ring-4 ring-[#00BDC3]/30 scale-110' : ''}`}
                    >
                      {isPast ? (
                        <span className="font-bold">{index + 1}</span>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium text-center ${
                        isPast ? 'text-[#111827]' : 'text-[#6B7280]'
                      }`}
                    >
                      {statusLabels[status]}
                    </p>
                  </div>
                  {index < rideStatuses.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 mt-[-30px] ${
                        index < currentStatusIndex ? 'bg-[#00BDC3]' : 'bg-[#E5E7EB]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#00BDC3]" />
              Customer Information
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

        {/* Driver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-[#00BDC3]" />
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {driver ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Driver Name</p>
                  <p className="font-semibold text-[#111827]">{driver.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Phone Number</p>
                  <p className="font-semibold text-[#111827]">{driver.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Vehicle</p>
                  <p className="font-semibold text-[#111827]">{driver.vehicle}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">License Plate</p>
                  <p className="font-semibold text-[#111827]">{driver.licensePlate}</p>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-[#00BDC3] hover:bg-[#009EA3] text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#6B7280]">No driver assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ride Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00BDC3]" />
              Ride Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Ride ID</p>
              <p className="font-semibold text-[#111827]">#{ride.id}</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Created At</p>
              <p className="font-semibold text-[#111827]">
                {format(ride.createdAt, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Last Updated</p>
              <p className="font-semibold text-[#111827]">
                {format(ride.updatedAt, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            {ride.fare && (
              <div>
                <p className="text-sm text-[#6B7280] mb-1">Estimated Fare</p>
                <p className="text-2xl font-bold text-[#00BDC3]">{ride.fare} ETB</p>
              </div>
            )}
            <Separator />
            {ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <Button
                variant="outline"
                className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Ride
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Live Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px] bg-[#E5E7EB] rounded-lg flex items-center justify-center">
            <p className="text-[#6B7280]">
              Live map tracking will be displayed here when Google Maps API is configured
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
