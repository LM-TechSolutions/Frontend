import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, MapPin, Navigation, Phone, DollarSign, Eye, Loader2, Bell } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel } from '../lib/format';
import GebetaMapView from '../components/GebetaMapView';
import LogCallDialog from '../components/LogCallDialog';
import NewRideDialog from '../components/NewRideDialog';

const ACTIVE_STATUSES = ['dispatched', 'accepted', 'arrived', 'in_progress'];

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    available: 'bg-[#10B981] text-white',
    busy: 'bg-[#EF4444] text-white',
    offline: 'bg-[#6B7280] text-white',
    pending: 'bg-[#F59E0B] text-white',
    dispatched: 'bg-[#00BDC3] text-white',
    accepted: 'bg-[#00BDC3] text-white',
    arrived: 'bg-[#00BDC3] text-white',
    in_progress: 'bg-[#00BDC3] text-white',
  };
  return colors[status] || 'bg-gray-500 text-white';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [redispatchingId, setRedispatchingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [ridesRes, driversRes] = await Promise.all([
        api.rides.list({ limit: 50 }),
        api.drivers.list({ limit: 100 }),
      ]);
      setRides(ridesRes.rides ?? []);
      setDrivers(driversRes.drivers ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket() ?? connectSocket();
    const refresh = () => load();
    socket.on('ride:status', refresh);
    socket.on('ride:completed', refresh);
    return () => {
      socket.off('ride:status', refresh);
      socket.off('ride:completed', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingRides = rides.filter((r) => r.status === 'pending' || r.status === 'unassigned');
  const activeRides = rides.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const availableDrivers = drivers.filter((d) => d.status === 'available');

  const fleet = useMemo(
    () =>
      drivers
        .filter((d) => d.currentLocation)
        .map((d) => ({
          lng: d.currentLocation.lng,
          lat: d.currentLocation.lat,
          color: d.status === 'available' ? '#10B981' : d.status === 'busy' ? '#EF4444' : '#6B7280',
        })),
    [drivers]
  );

  const handleRedispatch = async (ride: any) => {
    setRedispatchingId(ride.id);
    try {
      const res = await api.rides.redispatch(ride.id);
      if (res.dispatched) toast.success(`Re-notified ${res.candidates} nearby driver(s)`);
      else toast.warning('No eligible nearby drivers right now');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to re-notify drivers');
    } finally {
      setRedispatchingId(null);
    }
  };

  const handleAssign = async (driver: any, ride: any) => {
    try {
      await api.rides.assign(ride.id, driver.id);
      toast.success(`Ride assigned to ${driver.name}`);
      setAssignFor(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to assign driver');
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel */}
      <div className="w-[35%] border-r border-[#E5E7EB] bg-white overflow-auto">
        <div className="p-6">
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Button className="h-12 bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => setNewRideOpen(true)}>
              <Plus className="w-5 h-5 mr-2" /> NEW RIDE
            </Button>
            <LogCallDialog onLogged={load} className="h-12 w-full" />
          </div>
          <NewRideDialog open={newRideOpen} onOpenChange={setNewRideOpen} onCreated={load} />

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
          ) : (
            <>
              {/* Pending */}
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
                              <Phone className="w-3 h-3" /> {ride.customerPhone}
                            </p>
                          </div>
                          <Badge className={statusBadge(ride.status)}>{rideStatusLabel(ride.status)}</Badge>
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
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/rides/${ride.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> Track
                          </Button>
                          <Button className="flex-1 bg-[#00BDC3] hover:bg-[#009EA3] text-white" size="sm" onClick={() => setAssignFor(ride)}>
                            Assign
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-[#00BDC3] text-[#00BDC3] hover:bg-[#00BDC3] hover:text-white"
                          onClick={() => handleRedispatch(ride)}
                          disabled={redispatchingId === ride.id}
                        >
                          {redispatchingId === ride.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                          Re-notify Drivers
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {pendingRides.length === 0 && <p className="text-sm text-[#6B7280] text-center py-6">No pending rides</p>}
                </div>
              </div>

              {/* Active */}
              <div>
                <h3 className="font-semibold text-[#111827] mb-3">Active Rides ({activeRides.length})</h3>
                <div className="space-y-3">
                  {activeRides.map((ride) => (
                    <Card key={ride.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-[#111827]">{ride.customerName}</p>
                            <p className="text-sm text-[#6B7280]">Driver: {ride.driverName ?? '—'}</p>
                          </div>
                          <Badge className={statusBadge(ride.status)}>{rideStatusLabel(ride.status)}</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/rides/${ride.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {activeRides.length === 0 && <p className="text-sm text-[#6B7280] text-center py-6">No active rides</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Gebeta Map */}
      <div className="flex-1 relative">
        <GebetaMapView fleet={fleet} height="100%" zoom={12} className="w-full h-full" />
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[400]">
          <h4 className="font-semibold text-sm mb-2">Driver Status</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10B981]" /><span>Available ({drivers.filter((d) => d.status === 'available').length})</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EF4444]" /><span>Busy ({drivers.filter((d) => d.status === 'busy').length})</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6B7280]" /><span>Offline ({drivers.filter((d) => d.status === 'offline').length})</span></div>
          </div>
        </div>
      </div>

      {/* Assign driver dialog */}
      <Dialog open={!!assignFor} onOpenChange={(open) => !open && setAssignFor(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Driver to {assignFor?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4 max-h-[400px] overflow-auto">
            {availableDrivers.map((driver) => (
              <Card key={driver.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-[#111827]">{driver.name}</p>
                        <Badge className={statusBadge(driver.status)}>{driver.status}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-[#6B7280]">
                        <p>{driver.vehicleType} - {driver.licensePlate}</p>
                        <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {driver.phone}</p>
                        <p className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Coupon: {driver.couponBalance}</p>
                      </div>
                    </div>
                    <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => assignFor && handleAssign(driver, assignFor)}>
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {availableDrivers.length === 0 && <p className="text-sm text-[#6B7280] text-center py-6">No available drivers</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
