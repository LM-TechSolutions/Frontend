import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Plus, MapPin, Navigation, Phone, DollarSign, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { mockDrivers, mockRides } from '../data/mockData';
import { Driver, Ride } from '../types';
import { toast } from 'sonner';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Addis Ababa center
const center = {
  lat: 9.0320,
  lng: 38.7469
};

// Note: In production, use environment variable for API key
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';

export default function Dashboard() {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [drivers] = useState<Driver[]>(mockDrivers);
  const [rides, setRides] = useState<Ride[]>(mockRides);

  // Form state for new ride
  const [newRide, setNewRide] = useState({
    customerName: '',
    customerPhone: '',
    pickupLocation: '',
    dropoffLocation: ''
  });

  const pendingRides = rides.filter(r => r.status === 'pending');
  const activeRides = rides.filter(r => ['dispatched', 'accepted', 'arrived', 'in_progress'].includes(r.status));

  const getDriverColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10B981'; // green
      case 'busy':
        return '#EF4444'; // red
      case 'offline':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      available: 'bg-[#10B981] text-white',
      busy: 'bg-[#EF4444] text-white',
      offline: 'bg-[#6B7280] text-white',
      pending: 'bg-[#F59E0B] text-white',
      in_progress: 'bg-[#00BDC3] text-white'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const handleCreateRide = () => {
    if (!newRide.customerName || !newRide.customerPhone || !newRide.pickupLocation || !newRide.dropoffLocation) {
      toast.error('Please fill in all fields');
      return;
    }

    // Create new ride with mock coordinates
    const ride: Ride = {
      id: `r${rides.length + 1}`,
      customerId: `c${rides.length + 1}`,
      customerName: newRide.customerName,
      customerPhone: newRide.customerPhone,
      pickupLocation: newRide.pickupLocation,
      pickupCoordinates: { lat: 9.0320 + Math.random() * 0.05, lng: 38.7469 + Math.random() * 0.05 },
      dropoffLocation: newRide.dropoffLocation,
      dropoffCoordinates: { lat: 9.0320 + Math.random() * 0.05, lng: 38.7469 + Math.random() * 0.05 },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setRides([...rides, ride]);
    setNewRideOpen(false);
    setNewRide({ customerName: '', customerPhone: '', pickupLocation: '', dropoffLocation: '' });
    toast.success('Ride created successfully!');
  };

  const handleAssignDriver = (driver: Driver, ride: Ride) => {
    const updatedRides = rides.map(r => {
      if (r.id === ride.id) {
        return {
          ...r,
          driverId: driver.id,
          driverName: driver.name,
          status: 'dispatched' as const,
          updatedAt: new Date()
        };
      }
      return r;
    });
    setRides(updatedRides);
    setAssignDriverOpen(false);
    setSelectedRide(null);
    toast.success(`Ride assigned to ${driver.name}`);
  };

  const navigate = useNavigate();

  return (
    <div className="h-full flex">
      {/* Left Panel - Rides List */}
      <div className="w-[35%] border-r border-[#E5E7EB] bg-white overflow-auto">
        <div className="p-6">
          {/* New Ride Button */}
          <Dialog open={newRideOpen} onOpenChange={setNewRideOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 bg-[#00BDC3] hover:bg-[#009EA3] text-white mb-6">
                <Plus className="w-5 h-5 mr-2" />
                NEW RIDE
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Ride</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={newRide.customerName}
                    onChange={(e) => setNewRide({ ...newRide, customerName: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={newRide.customerPhone}
                    onChange={(e) => setNewRide({ ...newRide, customerPhone: e.target.value })}
                    placeholder="+251 911 234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupLocation">Pickup Location</Label>
                  <Input
                    id="pickupLocation"
                    value={newRide.pickupLocation}
                    onChange={(e) => setNewRide({ ...newRide, pickupLocation: e.target.value })}
                    placeholder="Enter pickup address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoffLocation">Destination Location</Label>
                  <Input
                    id="dropoffLocation"
                    value={newRide.dropoffLocation}
                    onChange={(e) => setNewRide({ ...newRide, dropoffLocation: e.target.value })}
                    placeholder="Enter destination address"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setNewRideOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                  onClick={handleCreateRide}
                >
                  Create Ride
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Pending Rides */}
          <div className="mb-6">
            <h3 className="font-semibold text-[#111827] mb-3">Pending Rides ({pendingRides.length})</h3>
            <div className="space-y-3">
              {pendingRides.map((ride) => (
                <Card key={ride.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-[#111827]">{ride.customerName}</p>
                        <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {ride.customerPhone}
                        </p>
                      </div>
                      <Badge className={getStatusBadge(ride.status)}>{ride.status}</Badge>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                        <span className="text-[#6B7280]">{ride.pickupLocation}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Navigation className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                        <span className="text-[#6B7280]">{ride.dropoffLocation}</span>
                      </div>
                    </div>
                    <Dialog open={assignDriverOpen && selectedRide?.id === ride.id} onOpenChange={(open) => {
                      setAssignDriverOpen(open);
                      if (!open) setSelectedRide(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                          onClick={() => setSelectedRide(ride)}
                        >
                          Assign Driver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[800px] max-h-[600px]">
                        <DialogHeader>
                          <DialogTitle>Assign Driver to Ride #{ride.id}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-3 py-4 max-h-[400px] overflow-auto">
                          {drivers.filter(d => d.status === 'available').map((driver) => (
                            <Card key={driver.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="font-semibold text-[#111827]">{driver.name}</p>
                                      <Badge className={getStatusBadge(driver.status)}>
                                        {driver.status}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-[#6B7280]">
                                      <p>{driver.vehicle} - {driver.licensePlate}</p>
                                      <p className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {driver.phone}
                                      </p>
                                      <p className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        Coupon Balance: {driver.couponBalance}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                                    onClick={() => handleAssignDriver(driver, ride)}
                                  >
                                    Assign
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
              {pendingRides.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-6">No pending rides</p>
              )}
            </div>
          </div>

          {/* Active Rides */}
          <div>
            <h3 className="font-semibold text-[#111827] mb-3">Active Rides ({activeRides.length})</h3>
            <div className="space-y-3">
              {activeRides.map((ride) => (
                <Card key={ride.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-[#111827]">{ride.customerName}</p>
                        <p className="text-sm text-[#6B7280]">Driver: {ride.driverName}</p>
                      </div>
                      <Badge className={getStatusBadge(ride.status)}>{ride.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-[#6B7280] mb-3">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                        {ride.pickupLocation}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/rides/${ride.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {activeRides.length === 0 && (
                <p className="text-sm text-[#6B7280] text-center py-6">No active rides</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative">
        {/* Map placeholder with mock UI */}
        <div className="w-full h-full bg-[#E5E7EB] relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#6B7280] mb-4">
                Google Maps Integration
              </p>
              <p className="text-sm text-[#6B7280] max-w-md">
                To enable the map, add your Google Maps API key to the GOOGLE_MAPS_API_KEY constant.
                Get your API key from: https://console.cloud.google.com/google/maps-apis
              </p>
            </div>
          </div>
          
          {/* Mock driver markers visualization */}
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <h4 className="font-semibold text-sm mb-2">Driver Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                <span>Available ({drivers.filter(d => d.status === 'available').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                <span>Busy ({drivers.filter(d => d.status === 'busy').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#6B7280]"></div>
                <span>Offline ({drivers.filter(d => d.status === 'offline').length})</span>
              </div>
            </div>
          </div>

          {/* Uncomment this section when you have a valid Google Maps API key */}
          {/*
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={13}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {drivers.map((driver) => (
                <Marker
                  key={driver.id}
                  position={driver.location}
                  onClick={() => setSelectedDriver(driver)}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: getDriverColor(driver.status),
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 8,
                  }}
                />
              ))}

              {selectedDriver && (
                <InfoWindow
                  position={selectedDriver.location}
                  onCloseClick={() => setSelectedDriver(null)}
                >
                  <div className="p-2">
                    <p className="font-semibold">{selectedDriver.name}</p>
                    <p className="text-sm text-gray-600">{selectedDriver.vehicle}</p>
                    <p className="text-sm">Status: <Badge className={getStatusBadge(selectedDriver.status)}>{selectedDriver.status}</Badge></p>
                    <p className="text-sm">Coupons: {selectedDriver.couponBalance}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          */}
        </div>
      </div>
    </div>
  );
}