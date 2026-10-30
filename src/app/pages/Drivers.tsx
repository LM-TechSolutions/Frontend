import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Edit, Eye, Loader2, Wallet, Phone, Users, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { patchDriverDuty, patchDriverFromRide } from '../lib/fleet';
import GebetaMapView from '../components/GebetaMapView';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, FilterBar, Surface, Facet } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { BalancePill, EmptyState, Initials, StatTile, timeAgo } from '../components/coupons/CouponAtoms';
import DriverPhotoField from '../components/DriverPhotoField';
import { FieldAvailabilityBadge, useFieldAvailability } from '../components/FieldAvailabilityBadge';

const statusColor = (s: string) =>
  s === 'available' ? '#0B7A55' : s === 'busy' ? '#AE2E2D' : '#6B7280';

const emptyNew = {
  name: '', phone: '', email: '', vehicleType: 'sedan', vehicleModel: '',
  licensePlate: '', licenseNumber: '', couponBalance: 0, profilePicture: null as string | null,
  password: 'Driver!123',
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
  const [deletingDriver, setDeletingDriver] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState(emptyNew);

  // Live real-time uniqueness checker for Add Driver dialog
  const { statuses: addStatuses, canSubmit: canSubmitAdd, hasConflict: hasConflictAdd } = useFieldAvailability({
    email: form.email,
    phone: form.phone,
    licensePlate: form.licensePlate,
    licenseNumber: form.licenseNumber,
  });

  const [edit, setEdit] = useState({
    name: '',
    phone: '',
    vehicleModel: '',
    licensePlate: '',
    commissionPercent: 10,
    canStreetHail: false,
    profilePicture: null as string | null,
  });

  // Live real-time uniqueness checker for Edit Driver dialog
  const { statuses: editStatuses, canSubmit: canSubmitEdit, hasConflict: hasConflictEdit } = useFieldAvailability({
    phone: edit.phone,
    licensePlate: edit.licensePlate,
    excludeDriverId: editing?.id,
    excludeUserId: editing?.userId,
  });
  const [minCouponBalance, setMinCouponBalance] = useState(10);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'busy' | 'offline'>('all');

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
      'ride:accepted',
      'ride:arrived',
      'ride:started',
      'ride:completed',
      'ride:cancelled',
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
        return prev.map((d: any) => (d.id === payload.driverId ? patchDriverDuty(d, payload) : d));
      }
      if (event.startsWith('ride:') && payload?.driverId) {
        return prev.map((d: any) => patchDriverFromRide(d, event, payload));
      }
      return prev;
    },
  });

  const drivers = liveDrivers ?? [];

  const fleet = useMemo(
    () =>
      drivers
        .filter((d) => d.currentLocation)
        .filter((d) => mapFilter === 'all' || d.status === mapFilter)
        .map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          lng: d.currentLocation.lng,
          lat: d.currentLocation.lat,
          color: statusColor(d.status),
          photoUrl: d.profilePicture ?? null,
          kind: 'driver' as const,
          detail: [d.vehicleType, d.licensePlate].filter(Boolean).join(' · ') || undefined,
        })),
    [drivers, mapFilter]
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
      toast.error(t('drivers.fillFields'));
      return;
    }
    setSaving(true);
    try {
      const created = await api.drivers.create({
        name: form.name, phone: form.phone, email: form.email,
        vehicleType: form.vehicleType, vehicleModel: form.vehicleModel,
        licensePlate: form.licensePlate, licenseNumber: form.licenseNumber,
        profilePicture: form.profilePicture || undefined,
        password: form.password?.trim() || 'Driver!123',
      });
      if (form.couponBalance > 0 && created?.id) {
        await api.coupons.refill(created.id, form.couponBalance, 'Initial balance').catch(() => null);
      }
      toast.success(t('drivers.createSuccess'));
      setAddOpen(false);
      setForm(emptyNew);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('drivers.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setEdit({
      name: d.name,
      phone: d.phone,
      vehicleModel: d.vehicleModel ?? '',
      licensePlate: d.licensePlate,
      commissionPercent: d.commissionPercent ?? 10,
      canStreetHail: d.canStreetHail === true,
      profilePicture: d.profilePicture ?? null,
    });
  };

  const handleEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.drivers.update(editing.id, {
        name: edit.name, phone: edit.phone, vehicleModel: edit.vehicleModel,
        licensePlate: edit.licensePlate, commissionPercent: edit.commissionPercent,
        canStreetHail: edit.canStreetHail,
        profilePicture: edit.profilePicture ?? '',
      });
      toast.success(t('drivers.editSuccess'));
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('drivers.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRefill = async () => {
    if (!refill) return;
    const amount = Number(refillAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('drivers.enterCouponAmount'));
      return;
    }
    setSaving(true);
    try {
      await api.coupons.refill(refill.id, amount, 'Inline refill');
      toast.success(t('drivers.refillSuccess', undefined, { amount, name: refill.name }));
      setRefill(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('drivers.refillFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!deletingDriver) return;
    setIsDeleting(true);
    try {
      await api.drivers.remove(deletingDriver.id);
      toast.success(t('drivers.deletedSuccess', 'Driver {name} deleted successfully', { name: deletingDriver.name }));
      setDeletingDriver(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || t('drivers.deleteFailed', 'Failed to delete driver'));
    } finally {
      setIsDeleting(false);
    }
  };

  const facets: Array<{ id: Facet; label: string; count: number }> = [
    { id: 'all', label: t('common.all'), count: drivers.length },
    { id: 'available', label: t('drivers.online'), count: drivers.filter((d) => d.status === 'available').length },
    { id: 'busy', label: t('drivers.busy'), count: drivers.filter((d) => d.status === 'busy').length },
    { id: 'offline', label: t('drivers.offline'), count: drivers.filter((d) => d.status === 'offline').length },
    { id: 'low', label: t('drivers.criticalCoupons'), count: drivers.filter((d) => (d.couponBalance ?? 0) < minCouponBalance).length },
    { id: 'watch', label: t('drivers.lowCoupons'), count: drivers.filter((d) => (d.couponBalance ?? 0) >= minCouponBalance && (d.couponBalance ?? 0) < Math.max(minCouponBalance * 3, 30)).length },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={t('drivers.fleet')}
        title={t('drivers.title', 'Drivers')}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> {t('drivers.addButton', 'Add driver')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/50">
                <DialogTitle className="text-xl">{t('drivers.addTitle', 'Add new driver')}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto px-6 py-4 space-y-4">
                <DriverPhotoField
                  name={form.name}
                  value={form.profilePicture}
                  onChange={(profilePicture) => setForm({ ...form, profilePicture })}
                  disabled={saving}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label>{t('drivers.fullName', 'Full name *')}</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Abebe Bikila" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>{t('drivers.phone', 'Phone *')}</Label>
                      <FieldAvailabilityBadge status={addStatuses.phone} />
                    </div>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0911…"
                      className={addStatuses.phone?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>{t('drivers.email', 'Email *')}</Label>
                      <FieldAvailabilityBadge status={addStatuses.email} />
                    </div>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="driver@…"
                      className={addStatuses.email?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('drivers.vehicleType', 'Vehicle type')}</Label>
                    <Select value={form.vehicleType} onValueChange={(v) => setForm({ ...form, vehicleType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">{t('common.sedan')}</SelectItem>
                        <SelectItem value="suv">{t('common.suv')}</SelectItem>
                        <SelectItem value="van">{t('common.van')}</SelectItem>
                        <SelectItem value="motorcycle">{t('common.motorcycle')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t('drivers.vehicleModel', 'Vehicle model')}</Label>
                    <Input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Toyota Corolla" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>{t('drivers.licensePlate', 'License plate *')}</Label>
                      <FieldAvailabilityBadge status={addStatuses.licensePlate} />
                    </div>
                    <Input
                      value={form.licensePlate}
                      onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                      placeholder="AA-12345"
                      className={addStatuses.licensePlate?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>{t('drivers.licenseNumber', 'License number *')}</Label>
                      <FieldAvailabilityBadge status={addStatuses.licenseNumber} />
                    </div>
                    <Input
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      placeholder="DL-…"
                      className={addStatuses.licenseNumber?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('drivers.initialCouponBalance', 'Initial coupon balance')}</Label>
                    <Input type="number" value={form.couponBalance} onChange={(e) => setForm({ ...form, couponBalance: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5 rounded-xl border border-border/70 bg-muted/30 p-3">
                    <Label className="text-xs font-semibold">{t('drivers.temporaryPassword', 'Initial password')}</Label>
                    <Input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Driver!123"
                      className="h-9 font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Default is <span className="font-mono font-semibold text-foreground">Driver!123</span>. An SMS and email with these login credentials will be delivered to the driver automatically.
                    </p>
                  </div>
                </div>

                {hasConflictAdd && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
                    One or more fields conflict with an existing account. Please resolve before adding.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
                <Button variant="outline" onClick={() => setAddOpen(false)}>{t('drivers.cancel', 'Cancel')}</Button>
                <Button onClick={handleAdd} disabled={saving || !canSubmitAdd || hasConflictAdd}>
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
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('drivers.vehicleFilter')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('drivers.allVehicles')}</SelectItem>
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
          <h4 className="text-sm font-semibold">{t('drivers.liveFleetMap')}</h4>
        </div>
        <GebetaMapView
          fleet={fleet}
          height={320}
          zoom={12}
          className="w-full"
          onFleetSelect={(id) => navigate(`/employees/${id}`)}
          overlay={
            <div className="pointer-events-auto absolute left-3 top-3 w-[220px] rounded-2xl border border-border/80 bg-card/95 p-3 text-xs shadow-md backdrop-blur">
              <p className="mb-2 font-semibold">{t('drivers.liveFleet')}</p>
              <div className="mb-2 grid grid-cols-2 gap-1">
                {(
                  [
                    ['all', t('common.all')],
                    ['available', t('drivers.online')],
                    ['busy', t('drivers.busy')],
                    ['offline', t('drivers.off')],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMapFilter(id)}
                    className={`rounded-lg px-2 py-1 text-left font-medium ${
                      mapFilter === id ? 'bg-primary/12 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0B7A55]" />
                  {t('drivers.availableCount', undefined, { count: drivers.filter((d) => d.status === 'available').length })}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#AE2E2D]" />
                  {t('drivers.busyCount', undefined, { count: drivers.filter((d) => d.status === 'busy').length })}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6B7280]" />
                  {t('drivers.offlineCount', undefined, { count: drivers.filter((d) => d.status === 'offline').length })}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t('drivers.gpsHint', undefined, { count: fleet.length })}
              </p>
            </div>
          }
        />
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
                <TableHead className="font-semibold">{t('drivers.lastSeen')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Initials name={d.name} src={d.profilePicture} className="h-10 w-10 text-xs" />
                      <div className="min-w-0">
                        <p className="font-medium">{d.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{d.licensePlate}</p>
                      </div>
                    </div>
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
                      <Button variant="ghost" size="sm" title={t('drivers.refillCoupons')} onClick={() => { setRefill(d); setRefillAmount('25'); }}>
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        title={t('common.delete', 'Delete')}
                        onClick={() => setDeletingDriver(d)}
                      >
                        <Trash2 className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-2xl max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/50">
            <DialogTitle className="text-xl">{t('drivers.edit', 'Edit driver')}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <DriverPhotoField
              name={edit.name}
              value={edit.profilePicture}
              onChange={(profilePicture) => setEdit({ ...edit, profilePicture })}
              disabled={saving}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label>{t('drivers.fullName', 'Full name')}</Label>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t('drivers.phone', 'Phone')}</Label>
                  <FieldAvailabilityBadge status={editStatuses.phone} />
                </div>
                <Input
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  className={editStatuses.phone?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t('drivers.vehicleModel', 'Vehicle model')}</Label>
                <Input value={edit.vehicleModel} onChange={(e) => setEdit({ ...edit, vehicleModel: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t('drivers.licensePlate', 'License plate')}</Label>
                  <FieldAvailabilityBadge status={editStatuses.licensePlate} />
                </div>
                <Input
                  value={edit.licensePlate}
                  onChange={(e) => setEdit({ ...edit, licensePlate: e.target.value })}
                  className={editStatuses.licensePlate?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t('drivers.commission', 'Tekumma commission (%)')}</Label>
                <Input
                  type="number"
                  value={edit.commissionPercent}
                  onChange={(e) => setEdit({ ...edit, commissionPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Street hail toggle neatly matched in the second column */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2.5">
                <div className="min-w-0 pr-2">
                  <Label className="text-sm font-semibold leading-none">{t('drivers.streetHail', 'Can record street hails')}</Label>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {t(
                      'drivers.streetHailHint',
                      'Lets driver start trip for hail.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={edit.canStreetHail}
                  onCheckedChange={(v) => setEdit({ ...edit, canStreetHail: v })}
                />
              </div>
            </div>

            {hasConflictEdit && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs text-rose-500 font-medium">
                This phone number or license plate is already used by another account.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button variant="outline" onClick={() => setEditing(null)}>{t('drivers.cancel', 'Cancel')}</Button>
            <Button onClick={handleEdit} disabled={saving || !canSubmitEdit || hasConflictEdit}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('drivers.update', 'Update driver')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refill} onOpenChange={(o) => !o && setRefill(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {refill ? <Initials name={refill.name} src={refill.profilePicture} className="h-10 w-10 text-xs" /> : null}
              <span>{t('drivers.refillTitle', undefined, { name: refill?.name ?? '' })}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{t('drivers.currentBalance', undefined, { count: refill?.couponBalance ?? 0 })}</p>
            <Label>{t('common.amount')}</Label>
            <Input type="number" min={1} value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} className="h-11 tabular-nums" />
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((q) => (
                <Button key={q} type="button" size="sm" variant="outline" onClick={() => setRefillAmount(String(q))}>+{q}</Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRefill(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleRefill} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('coupons.refill')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDriver} onOpenChange={(o) => !o && setDeletingDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('drivers.removeTitle', 'Delete driver {name}?', { name: deletingDriver?.name ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'drivers.removeBody',
                'Their driver profile, login credentials, and vehicle registration will be permanently deleted. This cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteDriver();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
