import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Edit, Eye, Loader2, Wallet, Phone, Users } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import GebetaMapView from '../components/GebetaMapView';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, FilterBar, Surface, Facet } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { BalancePill, EmptyState, StatTile, timeAgo } from '../components/coupons/CouponAtoms';

const statusColor = (s: string) =>
  s === 'available' ? '#0B7A55' : s === 'busy' ? '#AE2E2D' : '#6B7280';

const emptyNew = {
  name: '', phone: '', email: '', vehicleType: 'sedan', vehicleModel: '',
  licensePlate: '', licenseNumber: '', couponBalance: 0,
};

type Facet = 'all' | 'available' | 'busy' | 'offline' | 'low' | 'watch' | 'healthy';

export default function Drivers() {
  const navigate = useNavigate();
  const { t, language } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [facet, setFacet] = useState<Facet>('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [refill, setRefill] = useState<any | null>(null);
  const [refillAmount, setRefillAmount] = useState('25');
  const [form, setForm] = useState(emptyNew);
  const [edit, setEdit] = useState({ name: '', phone: '', vehicleModel: '', licensePlate: '', commissionPercent: 10 });
  const [minCouponBalance, setMinCouponBalance] = useState(10);

  const fetchDrivers = useCallback(async () => {
    const [res, ops] = await Promise.all([
      api.drivers.list({ limit: 200 }),
      api.settings.opsConfig().catch(() => null),
    ]);
    if (ops?.minCouponBalance != null) setMinCouponBalance(ops.minCouponBalance);
    return res.drivers ?? [];
  }, []);

  const { data: liveDrivers, loading, reload: load } = useRealtimeCollection({
    load: fetchDrivers,
    subscribeMap: true,
    events: [
      'driver:status',
      'driver:approved',
      'driver:suspended',
      'ride:status',
      'coupon:low',
      'coupon:empty',
      'coupon:balance',
      'driver:location',
    ],
    refetchEvents: ['driver:approved', 'driver:suspended'],
    apply: (prev, event, payload) => {
      if (event === 'driver:location' && payload?.driverId && typeof payload.latitude === 'number') {
        return prev.map((d: any) =>
          d.id === payload.driverId
            ? { ...d, currentLocation: { lat: payload.latitude, lng: payload.longitude }, updatedAt: new Date().toISOString() }
            : d
        );
      }
      if (event === 'coupon:balance' && payload?.driverId) {
        return prev.map((d: any) => (d.id === payload.driverId ? { ...d, couponBalance: payload.balance } : d));
      }
      if (event === 'driver:status' && payload?.driverId) {
        return prev.map((d: any) => (d.id === payload.driverId ? { ...d, status: payload.status ?? d.status } : d));
      }
      return prev;
    },
  });

  const drivers = liveDrivers ?? [];

  const fleet = useMemo(
    () =>
      drivers
        .filter((d) => d.currentLocation)
        .map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          lng: d.currentLocation.lng,
          lat: d.currentLocation.lat,
          color: statusColor(d.status),
        })),
    [drivers]
  );

  const vehicles = useMemo(
    () => Array.from(new Set(drivers.map((d) => d.vehicleType).filter(Boolean))),
    [drivers]
  );

  const visible = drivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (d.name ?? '').toLowerCase().includes(q) ||
      (d.phone ?? '').toLowerCase().includes(q) ||
      (d.licensePlate ?? '').toLowerCase().includes(q);
    const balance = d.couponBalance ?? 0;
    const watchCutoff = Math.max(minCouponBalance * 3, 30);
    const band = balance < minCouponBalance ? 'low' : balance < watchCutoff ? 'watch' : 'healthy';
    const matchesFacet =
      facet === 'all' ||
      d.status === facet ||
      facet === band;
    const matchesVehicle = vehicleFilter === 'all' || d.vehicleType === vehicleFilter;
    return matchesSearch && matchesFacet && matchesVehicle;
  }).sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', language === 'am' ? 'am' : language === 'om' ? 'om' : 'en', {
      sensitivity: 'base',
    })
  );

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.email || !form.licensePlate || !form.licenseNumber) {
      toast.error('Name, phone, email, license plate and license number are required');
      return;
    }
    setSaving(true);
    try {
      const created = await api.drivers.create({
        name: form.name, phone: form.phone, email: form.email,
        vehicleType: form.vehicleType, vehicleModel: form.vehicleModel,
        licensePlate: form.licensePlate, licenseNumber: form.licenseNumber,
      });
      if (form.couponBalance > 0 && created?.id) {
        await api.coupons.refill(created.id, form.couponBalance, 'Initial balance').catch(() => null);
      }
      toast.success('Driver added');
      setAddOpen(false);
      setForm(emptyNew);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setEdit({ name: d.name, phone: d.phone, vehicleModel: d.vehicleModel ?? '', licensePlate: d.licensePlate, commissionPercent: d.commissionPercent ?? 10 });
  };

  const handleEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.drivers.update(editing.id, {
        name: edit.name, phone: edit.phone, vehicleModel: edit.vehicleModel,
        licensePlate: edit.licensePlate, commissionPercent: edit.commissionPercent,
      });
      toast.success('Driver updated');
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update driver');
    } finally {
      setSaving(false);
    }
  };

  const handleRefill = async () => {
    if (!refill) return;
    const amount = Number(refillAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a coupon amount');
      return;
    }
    setSaving(true);
    try {
      await api.coupons.refill(refill.id, amount, 'Inline refill');
      toast.success(`Added ${amount} coupons to ${refill.name}`);
      setRefill(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Refill failed');
    } finally {
      setSaving(false);
    }
  };

  const facets: Array<{ id: Facet; label: string; count: number }> = [
    { id: 'all', label: 'All', count: drivers.length },
    { id: 'available', label: 'Online', count: drivers.filter((d) => d.status === 'available').length },
    { id: 'busy', label: 'Busy', count: drivers.filter((d) => d.status === 'busy').length },
    { id: 'offline', label: 'Offline', count: drivers.filter((d) => d.status === 'offline').length },
    { id: 'low', label: 'Critical coupons', count: drivers.filter((d) => (d.couponBalance ?? 0) < minCouponBalance).length },
    { id: 'watch', label: 'Low coupons', count: drivers.filter((d) => (d.couponBalance ?? 0) >= minCouponBalance && (d.couponBalance ?? 0) < Math.max(minCouponBalance * 3, 30)).length },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Fleet"
        title={t('drivers.title', 'Drivers')}
        description={t('drivers.subtitle', 'Availability, coupons, and last seen - live over the socket.')}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> {t('drivers.addButton', 'Add driver')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{t('drivers.addTitle', 'Add new driver')}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-2"><Label>{t('drivers.fullName', 'Full name *')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t('drivers.phone', 'Phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0911…" /></div>
                  <div className="space-y-2"><Label>{t('drivers.email', 'Email *')}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@…" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('drivers.vehicleType', 'Vehicle type')}</Label>
                    <Select value={form.vehicleType} onValueChange={(v) => setForm({ ...form, vehicleType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{t('drivers.vehicleModel', 'Vehicle model')}</Label><Input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Toyota Corolla" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t('drivers.licensePlate', 'License plate')}</Label><Input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="AA-12345" /></div>
                  <div className="space-y-2"><Label>{t('drivers.licenseNumber', 'License number *')}</Label><Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-…" /></div>
                </div>
                <div className="space-y-2"><Label>{t('drivers.initialCouponBalance', 'Initial coupon balance')}</Label><Input type="number" value={form.couponBalance} onChange={(e) => setForm({ ...form, couponBalance: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAddOpen(false)}>{t('drivers.cancel', 'Cancel')}</Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('drivers.save', 'Add driver')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={t('drivers.totalDrivers', 'Total')} value={drivers.length} icon={Users} />
        <StatTile label={t('drivers.available', 'Available')} value={drivers.filter((d) => d.status === 'available').length} icon={Users} accent="#0B7A55" />
        <StatTile label={t('drivers.busy', 'Busy')} value={drivers.filter((d) => d.status === 'busy').length} icon={Users} accent="#AE2E2D" />
      </div>

      <FilterBar>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('drivers.searchPlaceholder', 'Search by name, phone, plate…')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 pl-10" />
        </div>
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Vehicle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="flex flex-wrap gap-2">
        {facets.map((item) => (
          <Facet key={item.id} active={facet === item.id} onClick={() => setFacet(item.id)}>
            {item.label} · {item.count}
          </Facet>
        ))}
      </div>

      <Surface>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Live fleet map</h4>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Socket · no polling</span>
        </div>
        <GebetaMapView fleet={fleet} height={320} zoom={12} className="w-full" />
      </Surface>

      <Surface>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="p-6"><EmptyState icon={Users} title={t('drivers.noDrivers', 'No drivers found')} /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="font-semibold">{t('drivers.driverName', 'Driver')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.phone', 'Phone')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.vehicle', 'Vehicle')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.couponBalance', 'Coupons')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.status', 'Status')}</TableHead>
                <TableHead className="font-semibold">Last seen</TableHead>
                <TableHead className="font-semibold">{t('drivers.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/50">
                  <TableCell>
                    <p className="font-medium">{d.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.licensePlate}</p>
                  </TableCell>
                  <TableCell>
                    <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Phone className="h-3 w-3" /> {d.phone}
                    </a>
                  </TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">{d.vehicleType ?? d.vehicleModel ?? '-'}</TableCell>
                  <TableCell>
                    <BalancePill balance={d.couponBalance ?? 0} threshold={minCouponBalance} size="sm" />
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.updatedAt ? timeAgo(d.updatedAt) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${d.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="Refill coupons" onClick={() => { setRefill(d); setRefillAmount('25'); }}>
                        <Wallet className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{t('drivers.edit', 'Edit driver')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2"><Label>{t('drivers.fullName', 'Full name')}</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.phone', 'Phone')}</Label><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.vehicleModel', 'Vehicle model')}</Label><Input value={edit.vehicleModel} onChange={(e) => setEdit({ ...edit, vehicleModel: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.licensePlate', 'License plate')}</Label><Input value={edit.licensePlate} onChange={(e) => setEdit({ ...edit, licensePlate: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.commission', 'Tokuma commission (%)')}</Label><Input type="number" value={edit.commissionPercent} onChange={(e) => setEdit({ ...edit, commissionPercent: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditing(null)}>{t('drivers.cancel', 'Cancel')}</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('drivers.update', 'Update driver')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refill} onOpenChange={(o) => !o && setRefill(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Refill {refill?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Current balance {refill?.couponBalance ?? 0} coupons.</p>
            <Label>Amount</Label>
            <Input type="number" min={1} value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} className="h-11 tabular-nums" />
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((q) => (
                <Button key={q} type="button" size="sm" variant="outline" onClick={() => setRefillAmount(String(q))}>+{q}</Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRefill(null)}>Cancel</Button>
            <Button onClick={handleRefill} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Refill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
