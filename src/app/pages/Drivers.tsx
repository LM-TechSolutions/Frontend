import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Edit, Eye, Loader2, Wallet, Phone, Users, Trash2, AlertTriangle, ShieldCheck, Smartphone, Unlink, Lock, Sparkles, CheckSquare, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { cn } from '../components/ui/utils';
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

const VEHICLE_COLOR_PRESETS = [
  { name: 'White', color: '#FFFFFF', border: '#CBD5E1' },
  { name: 'Black', color: '#18181B', border: '#3F3F46' },
  { name: 'Silver', color: '#94A3B8', border: '#64748B' },
  { name: 'Grey', color: '#475569', border: '#334155' },
  { name: 'Blue', color: '#3B82F6', border: '#2563EB' },
  { name: 'Red', color: '#EF4444', border: '#DC2626' },
  { name: 'Yellow', color: '#FACC15', border: '#EAB308' },
  { name: 'Green', color: '#10B981', border: '#059669' },
  { name: 'Bronze', color: '#92400E', border: '#78350F' },
  { name: 'Cyan', color: '#06B6D4', border: '#0891B2' },
];

const emptyNew = {
  name: '', phone: '', email: '', vehicleType: 'sedan', vehicleModel: '',
  vehicleColor: '',
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRefillOpen, setBulkRefillOpen] = useState(false);
  const [bulkRefillAmount, setBulkRefillAmount] = useState('50');
  const [bulkRefillNote, setBulkRefillNote] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    open: boolean;
    title: string;
    total: number;
    current: number;
    currentRowName: string;
    logs: Array<{ text: string; time: string; success?: boolean }>;
    running: boolean;
    completed: boolean;
  }>({
    open: false,
    title: '',
    total: 0,
    current: 0,
    currentRowName: '',
    logs: [],
    running: false,
    completed: false,
  });
  const [deletingDriver, setDeletingDriver] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unlinkingDriver, setUnlinkingDriver] = useState<any | null>(null);
  const [unlinkReason, setUnlinkReason] = useState('Device replaced / lost');
  const [isUnlinking, setIsUnlinking] = useState(false);
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
    vehicleColor: '',
    licensePlate: '',
    licenseNumber: '',
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
    initialValues: editing
      ? {
          phone: editing.phone,
          licensePlate: editing.licensePlate,
        }
      : undefined,
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
      'driver:street_hail_permission',
    ],
    refetchEvents: ['driver:approved', 'driver:suspended', 'driver:street_hail_permission'],
    apply: (prev, event, payload) => {
      if (event === 'driver:street_hail_permission' && payload?.driverId) {
        return prev.map((d: any) =>
          d.id === payload.driverId
            ? { ...d, canStreetHail: payload.canStreetHail === true }
            : d
        );
      }
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
        vehicleColor: form.vehicleColor,
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
      vehicleColor: d.vehicleColor ?? '',
      licensePlate: d.licensePlate,
      licenseNumber: d.licenseNumber ?? '',
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
        vehicleColor: edit.vehicleColor,
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

  const allVisibleSelected = visible.length > 0 && visible.every((d) => selectedIds.has(d.id));
  const someVisibleSelected = visible.some((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((d) => d.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleStreetHailSingle = async (driver: any) => {
    const next = !driver.canStreetHail;
    try {
      await api.drivers.bulkStreetHail([driver.id], next);
      toast.success(next ? `Street hail enabled for ${driver.name}` : `Street hail disabled for ${driver.name}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update street hail permission');
    }
  };

  const handleBulkStreetHail = async (allowed: boolean) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkProcessing(true);
    setBulkProgress({
      open: true,
      title: allowed ? 'Allowing Street Hail' : 'Revoking Street Hail',
      total: ids.length,
      current: 0,
      currentRowName: 'Preparing drivers...',
      logs: [],
      running: true,
      completed: false,
    });

    try {
      const logs: Array<{ text: string; time: string; success?: boolean }> = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const driver = visible.find((d: any) => d.id === id) || { name: 'Driver', vehiclePlate: id.slice(0, 8) };
        const label = `${driver.name} (${driver.vehiclePlate || driver.phone || id.slice(0, 8)})`;

        setBulkProgress(prev => ({
          ...prev,
          current: i + 1,
          currentRowName: label,
        }));

        await api.drivers.bulkStreetHail([id], allowed);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logs.unshift({
          text: `${driver.name}: Street hail ${allowed ? 'allowed & notified' : 'revoked'}`,
          time,
          success: true,
        });

        setBulkProgress(prev => ({
          ...prev,
          logs: [...logs],
        }));

        if (ids.length > 1) await new Promise(r => setTimeout(r, 40));
      }

      setBulkProgress(prev => ({
        ...prev,
        running: false,
        completed: true,
        currentRowName: 'All drivers updated',
      }));

      toast.success(allowed ? `Street hail enabled for ${ids.length} drivers` : `Street hail revoked for ${ids.length} drivers`);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Bulk street hail update failed');
      setBulkProgress(prev => ({ ...prev, running: false }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkRefill = async () => {
    const ids = Array.from(selectedIds);
    const amount = Number(bulkRefillAmount);
    if (!ids.length || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid refill amount');
      return;
    }
    setBulkRefillOpen(false);
    setBulkProcessing(true);
    setBulkProgress({
      open: true,
      title: `Bulk Coupon Refill (+${amount} ETB)`,
      total: ids.length,
      current: 0,
      currentRowName: 'Preparing drivers...',
      logs: [],
      running: true,
      completed: false,
    });

    try {
      const logs: Array<{ text: string; time: string; success?: boolean }> = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const driver = visible.find((d: any) => d.id === id) || { name: 'Driver', vehiclePlate: id.slice(0, 8) };
        const label = `${driver.name} (${driver.vehiclePlate || driver.phone || id.slice(0, 8)})`;

        setBulkProgress(prev => ({
          ...prev,
          current: i + 1,
          currentRowName: label,
        }));

        await api.coupons.refill(id, amount, bulkRefillNote || 'Bulk staff refill');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        logs.unshift({
          text: `${driver.name}: Credited +${amount} ETB`,
          time,
          success: true,
        });

        setBulkProgress(prev => ({
          ...prev,
          logs: [...logs],
        }));

        if (ids.length > 1) await new Promise(r => setTimeout(r, 40));
      }

      setBulkProgress(prev => ({
        ...prev,
        running: false,
        completed: true,
        currentRowName: 'All coupons refilled',
      }));

      toast.success(`Refilled ${ids.length} drivers (${amount} ETB each)`);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Bulk coupon refill failed');
      setBulkProgress(prev => ({ ...prev, running: false }));
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkDeleteOpen(false);
    setBulkProcessing(true);
    setBulkProgress({
      open: true,
      title: 'Bulk Delete Drivers',
      total: ids.length,
      current: 0,
      currentRowName: 'Preparing drivers...',
      logs: [],
      running: true,
      completed: false,
    });

    try {
      const logs: Array<{ text: string; time: string; success?: boolean }> = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const driver = visible.find((d: any) => d.id === id) || { name: 'Driver', vehiclePlate: id.slice(0, 8) };
        const label = `${driver.name} (${driver.vehiclePlate || driver.phone || id.slice(0, 8)})`;

        setBulkProgress(prev => ({
          ...prev,
          current: i + 1,
          currentRowName: label,
        }));

        try {
          await api.drivers.remove(id);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          logs.unshift({
            text: `${driver.name}: Deleted successfully`,
            time,
            success: true,
          });
        } catch (e: any) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          logs.unshift({
            text: `${driver.name}: Skipped (${e?.message || 'Active ride'})`,
            time,
            success: false,
          });
        }

        setBulkProgress(prev => ({
          ...prev,
          logs: [...logs],
        }));

        if (ids.length > 1) await new Promise(r => setTimeout(r, 40));
      }

      setBulkProgress(prev => ({
        ...prev,
        running: false,
        completed: true,
        currentRowName: 'Bulk delete finished',
      }));

      toast.success(`Processed bulk deletion for ${ids.length} drivers`);
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Bulk delete failed');
      setBulkProgress(prev => ({ ...prev, running: false }));
    } finally {
      setBulkProcessing(false);
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

  const handleUnlinkDevice = async () => {
    if (!unlinkingDriver) return;
    setIsUnlinking(true);
    try {
      const res = await api.drivers.unlinkDevice(unlinkingDriver.id, { reason: unlinkReason });
      toast.success(res.message || 'Device unlinked successfully');
      setUnlinkingDriver(null);
      setUnlinkReason('Device replaced / lost');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink device');
    } finally {
      setIsUnlinking(false);
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

                  {/* Vehicle Color Chooser */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t('drivers.vehicleColor', 'Vehicle color')}</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {VEHICLE_COLOR_PRESETS.map((preset) => {
                        const active = (form.vehicleColor || '').toLowerCase() === preset.name.toLowerCase();
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setForm({ ...form, vehicleColor: preset.name })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              active
                                ? 'ring-2 ring-primary ring-offset-1 bg-primary/10 text-primary font-bold'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted border border-border/60'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full inline-block shadow-xs shrink-0"
                              style={{ backgroundColor: preset.color, border: `1.5px solid ${preset.border}` }}
                            />
                            <span>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      placeholder="Or custom color name (e.g. Metallic Charcoal)"
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                      className="mt-1 text-sm"
                    />
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
          <div className="space-y-3">
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-primary/10 border border-primary/20 rounded-xl animate-in fade-in-50">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm text-foreground">
                    {selectedIds.size} {selectedIds.size === 1 ? 'driver' : 'drivers'} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Deselect
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkProcessing}
                    onClick={() => handleBulkStreetHail(true)}
                    className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Allow Street Hail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkProcessing}
                    onClick={() => handleBulkStreetHail(false)}
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Revoke Street Hail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkProcessing}
                    onClick={() => { setBulkRefillOpen(true); setBulkRefillAmount('50'); setBulkRefillNote(''); }}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Refill Coupons
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkProcessing}
                    onClick={() => setBulkDeleteOpen(true)}
                    className="h-8 gap-1.5 text-xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all drivers"
                    />
                  </TableHead>
                  <TableHead className="font-semibold">{t('drivers.driverName', 'Driver')}</TableHead>
                  <TableHead className="font-semibold">{t('drivers.phone', 'Phone')}</TableHead>
                  <TableHead className="font-semibold">{t('drivers.vehicle', 'Vehicle')}</TableHead>
                  <TableHead className="font-semibold">Device</TableHead>
                  <TableHead className="font-semibold">Street Hail</TableHead>
                  <TableHead className="font-semibold">{t('drivers.couponBalance', 'Coupons')}</TableHead>
                  <TableHead className="font-semibold">{t('drivers.status', 'Status')}</TableHead>
                  <TableHead className="font-semibold">{t('drivers.lastSeen')}</TableHead>
                  <TableHead className="font-semibold">{t('drivers.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {visible.map((d) => {
                const isSelected = selectedIds.has(d.id);
                return (
                <TableRow key={d.id} className={cn("hover:bg-muted/50 transition-colors", isSelected && "bg-primary/5")}>
                  <TableCell className="w-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectOne(d.id)}
                      aria-label={`Select ${d.name}`}
                    />
                  </TableCell>
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
                    {d.linkedDevice ? (
                      <button
                        type="button"
                        onClick={() => setUnlinkingDriver(d)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer group"
                        title={`Linked: ${d.linkedDevice.deviceName || 'Device'} - Click to manage or unlink`}
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="truncate max-w-[110px]">{d.linkedDevice.deviceName || 'Linked'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground bg-muted/40 border border-border/40">
                        <Smartphone className="w-3.5 h-3.5 opacity-40" />
                        <span>No device</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleToggleStreetHailSingle(d)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer group",
                        d.canStreetHail
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                      )}
                      title={d.canStreetHail ? "Street Hail Allowed - Click to revoke" : "Street Hail Disabled - Click to allow"}
                    >
                      <span className={cn("size-2 rounded-full", d.canStreetHail ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
                      <span>{d.canStreetHail ? "Allowed" : "Off"}</span>
                    </button>
                  </TableCell>
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
                      {d.linkedDevice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                          title="Unlink Device"
                          onClick={() => setUnlinkingDriver(d)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      )}
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
              );})}
            </TableBody>
          </Table>
          </div>
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
                  <Label className="inline-flex items-center gap-1.5">
                    <span>{t('drivers.licensePlate', 'License plate')}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </Label>
                </div>
                <Input
                  value={edit.licensePlate}
                  disabled
                  readOnly
                  className="bg-muted/50 cursor-not-allowed font-mono text-muted-foreground font-semibold"
                  title="Official registration license plates cannot be modified directly."
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="inline-flex items-center gap-1.5">
                    <span>{t('drivers.licenseNumber', 'License number')}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </Label>
                </div>
                <Input
                  value={edit.licenseNumber || '—'}
                  disabled
                  readOnly
                  className="bg-muted/50 cursor-not-allowed font-mono text-muted-foreground font-semibold"
                  title="Official permit / license numbers cannot be modified directly."
                />
              </div>

              {/* Vehicle Color Chooser */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('drivers.vehicleColor', 'Vehicle color')}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {VEHICLE_COLOR_PRESETS.map((preset) => {
                    const active = (edit.vehicleColor || '').toLowerCase() === preset.name.toLowerCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setEdit({ ...edit, vehicleColor: preset.name })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'ring-2 ring-primary ring-offset-1 bg-primary/10 text-primary font-bold'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted border border-border/60'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-block shadow-xs shrink-0"
                          style={{ backgroundColor: preset.color, border: `1.5px solid ${preset.border}` }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Or custom color name (e.g. Metallic Charcoal)"
                  value={edit.vehicleColor}
                  onChange={(e) => setEdit({ ...edit, vehicleColor: e.target.value })}
                  className="mt-1 text-sm"
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
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg">
                  {t('drivers.removeTitle', 'Permanently Delete Driver {name}?', { name: deletingDriver?.name ?? '' })}
                </AlertDialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Plate: <span className="font-mono font-medium text-foreground">{deletingDriver?.licensePlate || deletingDriver?.vehiclePlate || 'N/A'}</span>
                  {deletingDriver?.phone ? ` • Phone: ${deletingDriver.phone}` : ''}
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {t('drivers.removeWarning', 'This permanently removes the driver and their associated user login account from the platform. Review the cascaded changes below.')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>The following will be permanently cascaded & deleted:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                <li><strong className="text-foreground">User Login Account:</strong> Email, phone, credentials, Better-Auth sessions, and roles are purged (re-registration with this email/phone will be available immediately).</li>
                <li><strong className="text-foreground">Driver Fleet Profile:</strong> License documents, vehicle registration, and status flags.</li>
                <li><strong className="text-foreground">Operational Data:</strong> Real-time and historical GPS telemetry points, duty availability logs, and driver metrics.</li>
                <li><strong className="text-foreground">Coupon Wallet:</strong> Driver coupon balance, internal movements, and pending refill requests.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-1">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Accounting & Financial Ledger Safety:</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed pl-6">
                Completed and past ride records remain preserved in the system's ledger with the driver ID unlinked (set to NULL), ensuring company historical revenue, customer receipts, and trip audits remain 100% accurate.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="mt-2">
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
              {t('drivers.confirmDelete', 'Delete Driver & User')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!unlinkingDriver} onOpenChange={(o) => !o && setUnlinkingDriver(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Smartphone className="h-5 w-5 text-amber-500" />
              Unlink Driver Device
            </DialogTitle>
          </DialogHeader>

          {unlinkingDriver && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Single-Device Fleet Security Policy</p>
                  <p>
                    Unlinking immediately revokes this phone's authorization and active sessions, setting the driver offline.
                    The driver will then be allowed to sign in on their new or replacement phone.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold">{unlinkingDriver.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-mono text-xs">{unlinkingDriver.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Authorized Hardware:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    {unlinkingDriver.linkedDevice?.deviceName || 'Mobile Device'}
                  </span>
                </div>
                {unlinkingDriver.linkedDevice?.enrolledAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Linked Since:</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(unlinkingDriver.linkedDevice.enrolledAt)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Reason for Unlinking (Audit Trail)</Label>
                <Select value={unlinkReason} onValueChange={setUnlinkReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Device replaced / lost">Phone lost or replaced</SelectItem>
                    <SelectItem value="Phone stolen">Device reported stolen</SelectItem>
                    <SelectItem value="Technical reset / reinstall">App reinstalled / factory reset</SelectItem>
                    <SelectItem value="Administrative authorization">Administrative security reset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setUnlinkingDriver(null)} disabled={isUnlinking}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleUnlinkDevice}
                  disabled={isUnlinking}
                  className="gap-2"
                >
                  {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                  Confirm Unlink Device
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    
      {/* Bulk Coupon Refill Dialog */}
      <Dialog open={bulkRefillOpen} onOpenChange={setBulkRefillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Bulk Coupon Refill
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Refilling <span className="font-semibold text-foreground">{selectedIds.size}</span> selected {selectedIds.size === 1 ? 'driver' : 'drivers'}.
            </p>
            <div className="space-y-2">
              <Label>Refill Amount per Driver (ETB)</Label>
              <div className="flex gap-2">
                {['25', '50', '100', '200', '500'].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={bulkRefillAmount === amt ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => setBulkRefillAmount(amt)}
                  >
                    +{amt}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Custom amount"
                value={bulkRefillAmount}
                onChange={(e) => setBulkRefillAmount(e.target.value)}
                className="h-10 mt-2"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Optional Note</Label>
              <Input
                placeholder="Reason or dispatch batch note"
                value={bulkRefillNote}
                onChange={(e) => setBulkRefillNote(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between font-medium">
                <span>Total Drivers:</span>
                <span>{selectedIds.size}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground text-sm">
                <span>Total Coupons:</span>
                <span className="text-primary">{((Number(bulkRefillAmount) || 0) * selectedIds.size).toLocaleString()} ETB</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBulkRefillOpen(false)} disabled={bulkProcessing}>
                Cancel
              </Button>
              <Button onClick={handleBulkRefill} disabled={bulkProcessing}>
                {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Refill
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedIds.size} Selected Drivers?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete these {selectedIds.size} driver profiles? Drivers with active ongoing rides will be safely skipped. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedIds.size} Drivers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Progress & Live Activity Modal */}
      <Dialog
        open={bulkProgress.open}
        onOpenChange={(open) => {
          if (!bulkProgress.running) setBulkProgress((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-card">
          <div className="p-5 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center transition-colors",
                    bulkProgress.completed ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
                  )}
                >
                  {bulkProgress.completed ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {bulkProgress.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bulkProgress.completed
                      ? `Successfully completed ${bulkProgress.total} items`
                      : `Processing batch: ${bulkProgress.current} of ${bulkProgress.total} items`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                {Math.round((bulkProgress.current / Math.max(1, bulkProgress.total)) * 100)}%
              </span>
            </div>

            <Progress
              value={(bulkProgress.current / Math.max(1, bulkProgress.total)) * 100}
              className={cn("h-1.5 transition-all duration-300", bulkProgress.completed && "[&>div]:bg-emerald-500")}
            />

            {!bulkProgress.completed && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-semibold text-foreground truncate">
                    {bulkProgress.currentRowName || 'Processing...'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-0.5">
                <span>Operation Live Log</span>
                <span>{bulkProgress.logs.length} logged</span>
              </div>
              <div className="max-h-44 min-h-24 overflow-y-auto rounded-xl bg-muted/20 border border-border/40 p-2.5 space-y-1.5 font-mono text-[11px]">
                {bulkProgress.logs.length === 0 ? (
                  <div className="text-muted-foreground/60 italic text-center py-4">
                    Initializing batch worker...
                  </div>
                ) : (
                  bulkProgress.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-foreground/90 animate-in fade-in-50 duration-200">
                      <span className={cn("flex-shrink-0 font-bold mt-0.5", log.success === false ? "text-amber-500" : "text-emerald-500")}>
                        {log.success === false ? "⚠" : "✓"}
                      </span>
                      <span className="flex-1 truncate">{log.text}</span>
                      <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end px-5 py-3 bg-muted/30 border-t border-border/60">
            <Button
              size="sm"
              variant={bulkProgress.completed ? "default" : "secondary"}
              disabled={bulkProgress.running}
              onClick={() => setBulkProgress((prev) => ({ ...prev, open: false }))}
              className="h-8 text-xs font-semibold px-4 cursor-pointer"
            >
              {bulkProgress.completed ? "Done" : "Processing..."}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Page>
  );
}
