import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import { Search, Filter, Eye, Plus, Bell, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import NewRideDialog from '../components/NewRideDialog';

const PENDING_STATES = ['pending', 'unassigned', 'dispatched'];

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
  const [redispatchingId, setRedispatchingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.rides.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    let t: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => load(), 400);
    };
    const events = [
      'ride:status',
      'ride:completed',
      'ride:accepted',
      'ride:arrived',
      'ride:started',
      'ride:cancelled',
    ] as const;
    events.forEach((ev) => socket.on(ev, refresh));
    const poll = setInterval(() => load(), 12000);
    return () => {
      if (t) clearTimeout(t);
      events.forEach((ev) => socket.off(ev, refresh));
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = rides.filter((r) => {
    const q = searchQuery.toLowerCase().replace(/^#/, ''); // strip leading # if user types it
    if (!q) return true;
    return (
      String(r.id).toLowerCase().includes(q) ||
      String(r.id).slice(0, 8).toLowerCase().includes(q) ||
      (r.customerName ?? '').toLowerCase().includes(q) ||
      (r.customerPhone ?? '').toLowerCase().includes(q) ||
      (r.driverName ?? '').toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-1">Ride History</h2>
        <p className="text-muted-foreground">View and manage all ride records</p>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by Ride ID, Customer, Driver…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-10" />
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
            <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => setNewRideOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Ride</Button>
          </div>
        </div>
      </div>

      <NewRideDialog open={newRideOpen} onOpenChange={setNewRideOpen} onCreated={() => { setPage(1); load(); }} />

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                {['Ride ID', 'Customer', 'Pickup', 'Dropoff', 'Driver', 'Status', 'Time', 'Fare', 'Actions'].map((h) => (
                  <TableHead key={h} className="font-semibold">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((ride) => (
                <TableRow key={ride.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">#{String(ride.id).slice(0, 8)}</TableCell>
                  <TableCell><div><p className="font-medium text-foreground">{ride.customerName}</p><p className="text-xs text-muted-foreground">{ride.customerPhone}</p></div></TableCell>
                  <TableCell className="max-w-[200px]"><p className="text-sm text-muted-foreground truncate">{ride.pickupLocation}</p></TableCell>
                  <TableCell className="max-w-[200px]"><p className="text-sm text-muted-foreground truncate">{ride.dropoffLocation}</p></TableCell>
                  <TableCell>{ride.driverName ? <p className="text-sm text-foreground">{ride.driverName}</p> : <p className="text-sm text-muted-foreground italic">Not assigned</p>}</TableCell>
                  <TableCell><Badge className={statusBadge(ride.status)}>{rideStatusLabel(ride.status)}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</TableCell>
                  <TableCell className="font-medium text-foreground">{ride.fare != null ? formatETB(ride.fare) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/rides/${ride.id}`)} title="Track"><Eye className="w-4 h-4" /></Button>
                      {PENDING_STATES.includes(ride.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#00BDC3] text-[#00BDC3] hover:bg-[#00BDC3] hover:text-white"
                          title="Re-notify nearby drivers"
                          onClick={() => handleRedispatch(ride)}
                          disabled={redispatchingId === ride.id}
                        >
                          {redispatchingId === ride.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && visible.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">No rides found</p></div>}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {visible.length} of {pagination.total} rides</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="outline" size="sm" className="bg-[#00BDC3] text-white hover:bg-[#009EA3]">{page}</Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
