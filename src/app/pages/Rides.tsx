import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import { Search, Filter, Eye, Plus, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import { ADDIS_CENTER } from '../lib/config';

const statusBadge = (status: string) =>
  ({
    pending: 'bg-[#F59E0B] text-white',
    unassigned: 'bg-[#F59E0B] text-white',
    dispatched: 'bg-[#00BDC3] text-white',
    accepted: 'bg-[#00BDC3] text-white',
    arrived: 'bg-[#00BDC3] text-white',
    in_progress: 'bg-[#00BDC3] text-white',
    completed: 'bg-[#10B981] text-white',
    cancelled: 'bg-[#EF4444] text-white',
    expired: 'bg-[#6B7280] text-white',
  } as any)[status] || 'bg-gray-500 text-white';

function extractCoords(res: any): { lat: number; lng: number } | null {
  const c = res?.coordinates ?? res;
  const lat = c?.latitude ?? c?.lat;
  const lng = c?.longitude ?? c?.lng;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}

const PAGE_SIZE = 20;

export default function Rides() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRide, setNewRide] = useState({ customerName: '', customerPhone: '', pickupLocation: '', dropoffLocation: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.rides.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRides(res.rides ?? []);
      setPagination(res.pagination ?? { page: 1, totalPages: 1, total: 0 });
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, searchQuery]);

  useEffect(() => {
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

  // Light client filter on the loaded page for id/customer/location text.
  const visible = rides.filter((r) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return `${r.id}${r.customerName}${r.pickupLocation}${r.dropoffLocation}`.toLowerCase().includes(q);
  });

  const handleCreateRide = async () => {
    const { customerName, customerPhone, pickupLocation, dropoffLocation } = newRide;
    if (!customerName || !customerPhone || !pickupLocation || !dropoffLocation) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const [pg, dg] = await Promise.all([
        api.map.geocode(pickupLocation).then(extractCoords).catch(() => null),
        api.map.geocode(dropoffLocation).then(extractCoords).catch(() => null),
      ]);
      await api.rides.create({
        customerName,
        customerPhone,
        pickupLocation,
        pickupCoordinates: pg ?? { lat: ADDIS_CENTER[1], lng: ADDIS_CENTER[0] },
        dropoffLocation,
        dropoffCoordinates: dg ?? { lat: ADDIS_CENTER[1] + 0.03, lng: ADDIS_CENTER[0] + 0.03 },
      });
      toast.success('Ride created — dispatching to nearby drivers');
      setNewRide({ customerName: '', customerPhone: '', pickupLocation: '', dropoffLocation: '' });
      setNewRideOpen(false);
      setPage(1);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create ride');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#111827] mb-1">Ride History</h2>
        <p className="text-[#6B7280]">View and manage all ride records</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input placeholder="Search by Ride ID, Customer, Location…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-10" />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Filter by Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispatched">Assigned</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="arrived">Driver Arriving</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={newRideOpen} onOpenChange={setNewRideOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"><Plus className="w-4 h-4 mr-2" /> New Ride</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader><DialogTitle>Create New Ride</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Customer Name</Label><Input value={newRide.customerName} onChange={(e) => setNewRide({ ...newRide, customerName: e.target.value })} placeholder="Enter customer name" /></div>
                  <div className="space-y-2"><Label>Customer Phone</Label><Input value={newRide.customerPhone} onChange={(e) => setNewRide({ ...newRide, customerPhone: e.target.value })} placeholder="0911 234567" /></div>
                  <div className="space-y-2"><Label>Pickup Location</Label><Input value={newRide.pickupLocation} onChange={(e) => setNewRide({ ...newRide, pickupLocation: e.target.value })} placeholder="e.g. Bole, Addis Ababa" /></div>
                  <div className="space-y-2"><Label>Dropoff Location</Label><Input value={newRide.dropoffLocation} onChange={(e) => setNewRide({ ...newRide, dropoffLocation: e.target.value })} placeholder="e.g. Megenagna, Addis Ababa" /></div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setNewRideOpen(false)}>Cancel</Button>
                  <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleCreateRide} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Create Ride
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                {['Ride ID', 'Customer', 'Pickup', 'Dropoff', 'Driver', 'Status', 'Time', 'Fare', 'Actions'].map((h) => (
                  <TableHead key={h} className="font-semibold">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((ride) => (
                <TableRow key={ride.id} className="hover:bg-[#F9FAFB]">
                  <TableCell className="font-medium">#{String(ride.id).slice(0, 8)}</TableCell>
                  <TableCell><div><p className="font-medium text-[#111827]">{ride.customerName}</p><p className="text-xs text-[#6B7280]">{ride.customerPhone}</p></div></TableCell>
                  <TableCell className="max-w-[200px]"><p className="text-sm text-[#6B7280] truncate">{ride.pickupLocation}</p></TableCell>
                  <TableCell className="max-w-[200px]"><p className="text-sm text-[#6B7280] truncate">{ride.dropoffLocation}</p></TableCell>
                  <TableCell>{ride.driverName ? <p className="text-sm text-[#111827]">{ride.driverName}</p> : <p className="text-sm text-[#6B7280] italic">Not assigned</p>}</TableCell>
                  <TableCell><Badge className={statusBadge(ride.status)}>{rideStatusLabel(ride.status)}</Badge></TableCell>
                  <TableCell className="text-sm text-[#6B7280]">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</TableCell>
                  <TableCell className="font-medium text-[#111827]">{ride.fare != null ? formatETB(ride.fare) : '-'}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => navigate(`/rides/${ride.id}`)}><Eye className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && visible.length === 0 && <div className="text-center py-12"><p className="text-[#6B7280]">No rides found</p></div>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">Showing {visible.length} of {pagination.total} rides</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="outline" size="sm" className="bg-[#00BDC3] text-white hover:bg-[#009EA3]">{page}</Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
