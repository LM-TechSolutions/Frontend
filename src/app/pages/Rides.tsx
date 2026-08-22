import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { Search, Eye, Plus, Bell, Loader2, Download, Ban, Car } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel, formatETB } from '../lib/format';
import NewRideDialog from '../components/NewRideDialog';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, FilterBar, Surface, Facet } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { EmptyState, Initials } from '../components/coupons/CouponAtoms';

const PENDING_STATES = ['pending', 'unassigned', 'dispatched'];
const STATUSES = ['all', 'pending', 'dispatched', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'expired'];
const PAGE_SIZE = 20;
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function Rides() {
  const navigate = useNavigate();
  const { t } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rides, setRides] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [range, setRange] = useState<DateRange | undefined>();
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [redispatchingId, setRedispatchingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set('q', searchQuery);
    if (statusFilter !== 'all') next.set('status', statusFilter);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [searchQuery, statusFilter, page, setSearchParams]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.rides.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        startDate: range?.from ? iso(range.from) : undefined,
        endDate: range?.to ? iso(range.to) : undefined,
      });
      setRides(res.rides ?? []);
      setPagination(res.pagination ?? { page: 1, totalPages: 1, total: 0 });
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message ?? t('rides.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, searchQuery, range]);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    const refresh = (data?: any) => {
      const id = data?.rideId ?? data?.id;
      if (data?.event === 'ride:created' || (id && data?.status == null && data?.event !== 'ride:status')) {
        if (!id) {
          void load();
          return;
        }
        setLiveIds((prev) => new Set(prev).add(id));
        setRides((prev) => (prev.some((r) => r.id === id) ? prev : [{ ...data, id, status: data.status ?? 'pending' }, ...prev]));
        return;
      }
      if (id) {
        setLiveIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setLiveIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 1800);
        setRides((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: data.status ?? r.status } : r))
        );
      }
    };
    const events = ['ride:created', 'ride:status', 'ride:completed', 'ride:accepted', 'ride:arrived', 'ride:started', 'ride:cancelled'] as const;
    events.forEach((ev) => socket.on(ev, refresh));
    const onReconnect = () => void load();
    socket.io.on('reconnect', onReconnect);
    return () => {
      events.forEach((ev) => socket.off(ev, refresh));
      socket.io.off('reconnect', onReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, searchQuery, range]);

  const allSelected = rides.length > 0 && rides.every((r) => selected.has(r.id));
  const selectedRides = useMemo(() => rides.filter((r) => selected.has(r.id)), [rides, selected]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rides.map((r) => r.id)) : new Set());
  };

  const handleRedispatch = async (ride: any) => {
    setRedispatchingId(ride.id);
    try {
      const res = await api.rides.redispatch(ride.id);
      if (res.dispatched) toast.success(t('rides.notifiedNearby', undefined, { count: res.candidates }));
      else toast.warning(t('dashboard.noEligibleNearby'));
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('dashboard.redispatchFailed'));
    } finally {
      setRedispatchingId(null);
    }
  };

  const bulkRedispatch = async () => {
    const targets = selectedRides.filter((r) => PENDING_STATES.includes(r.status));
    if (!targets.length) {
      toast.info(t('rides.selectPending'));
      return;
    }
    setBusy(true);
    try {
      const results = await Promise.allSettled(targets.map((r) => api.rides.redispatch(r.id)));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      toast.success(t('rides.reNotifiedOf', undefined, { ok, total: targets.length }));
      load();
    } finally {
      setBusy(false);
    }
  };

  const bulkCancel = async () => {
    const targets = selectedRides.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
    if (!targets.length) {
      toast.info(t('rides.selectOpenCancel'));
      return;
    }
    const confirmMsg =
      targets.length === 1
        ? t('rides.confirmCancelOne')
        : t('rides.confirmCancelMany', undefined, { count: targets.length });
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(targets.map((r) => api.rides.cancel(r.id, t('rides.bulkCancelNote'))));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      toast.success(t('rides.cancelledOf', undefined, { ok, total: targets.length }));
      load();
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = [
      t('rides.rideId'),
      t('rides.customer'),
      t('common.phone'),
      t('rides.pickup'),
      t('rides.dropoff'),
      t('rides.driver'),
      t('rides.status'),
      t('rides.createdAt'),
      t('rides.fare'),
    ];
    const rows = rides.map((r) =>
      [r.id, r.customerName, r.customerPhone, r.pickupLocation, r.dropoffLocation, r.driverName ?? '', r.status, r.createdAt, r.fare ?? '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rides-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('rides.exportedPage'));
  };

  return (
    <Page>
      <PageHeader
        eyebrow={t('rides.operations')}
        title={t('rides.title', 'Rides')}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rides.length}>
              <Download className="mr-2 h-4 w-4" /> {t('rides.csv')}
            </Button>
            <Button onClick={() => setNewRideOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t('rides.addRide', 'New ride')}
            </Button>
          </>
        }
      />

      <FilterBar>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('rides.searchPlaceholder', 'Search by ride ID, customer, or phone…')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <DateRangePicker value={range} onChange={(next) => { setRange(next); setPage(1); }} />
      </FilterBar>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Facet
            key={status}
            active={statusFilter === status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
          >
            {status === 'all' ? t('rides.allStatus', 'All') : rideStatusLabel(status)}
          </Facet>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
          <span className="font-medium">{t('common.selectedCount', undefined, { count: selected.size })}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={bulkRedispatch}>
            <Bell className="mr-1.5 h-4 w-4" /> {t('rides.reDispatch')}
          </Button>
          <Button size="sm" variant="outline" className="border-[#AE2E2D]/40 text-[#AE2E2D]" disabled={busy} onClick={bulkCancel}>
            <Ban className="mr-1.5 h-4 w-4" /> {t('common.cancel')}
          </Button>
        </div>
      )}

      <NewRideDialog open={newRideOpen} onOpenChange={setNewRideOpen} onCreated={() => { setPage(1); load(); }} />

      <Surface>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rides.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Car} title={t('rides.noRides', 'No rides found')} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
                </TableHead>
                {[t('rides.rideId', 'Ride ID'), t('rides.customer', 'Customer'), t('rides.pickup', 'Pickup'), t('rides.dropoff', 'Dropoff'), t('rides.driver', 'Driver'), t('rides.status', 'Status'), t('rides.time', 'Time'), t('rides.fare', 'Fare'), t('rides.actions', 'Actions')].map((h) => (
                  <TableHead key={h} className="font-semibold">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rides.map((ride) => (
                <TableRow key={ride.id} className={`hover:bg-muted/50 ${liveIds.has(ride.id) ? 'live-pulse' : ''}`}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(ride.id)}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (v === true) next.add(ride.id);
                          else next.delete(ride.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">#{String(ride.id).slice(0, 8)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{ride.customerName}</p>
                    <p className="text-xs text-muted-foreground">{ride.customerPhone}</p>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{ride.pickupLocation}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{ride.dropoffLocation}</TableCell>
                  <TableCell>
                    {ride.driverName ? (
                      <div className="flex items-center gap-2">
                        <Initials name={ride.driverName} src={ride.driverPhoto} className="h-8 w-8 text-[11px]" />
                        <p className="text-sm">{ride.driverName}</p>
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">{t('rides.notAssigned', 'Not assigned')}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(ride.createdAt), 'MMM dd, HH:mm')}</TableCell>
                  <TableCell className="font-medium">{ride.fare != null ? formatETB(ride.fare) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/rides/${ride.id}`)} title={t('rides.track', 'Track')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {PENDING_STATES.includes(ride.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          title={t('rides.reNotifyNearby')}
                          onClick={() => handleRedispatch(ride)}
                          disabled={redispatchingId === ride.id}
                        >
                          {redispatchingId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('rides.showingCount', 'Showing {0} of {1} rides', { 0: rides.length, 1: pagination.total })}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t('rides.previous', 'Previous')}
          </Button>
          <Button size="sm">{page}</Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            {t('rides.next', 'Next')}
          </Button>
        </div>
      </div>
    </Page>
  );
}
