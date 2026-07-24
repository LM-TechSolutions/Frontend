import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus, Edit, Eye, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { useAppContext } from '../contexts/AppContext';

const emptyNew = {
  name: '', phone: '', email: '', vehicleType: 'sedan', vehicleModel: '',
  licensePlate: '', licenseNumber: '', couponBalance: 0,
};

export default function Drivers() {
  const navigate = useNavigate();
  const { t } = useAppContext();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyNew);
  const [edit, setEdit] = useState({ name: '', phone: '', vehicleModel: '', licensePlate: '', commissionPercent: 10 });

  const load = async () => {
    try {
      const res = await api.drivers.list({ limit: 200 });
      setDrivers(res.drivers ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket() ?? connectSocket();
    let t: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => load(), 300);
    };
    const events = [
      'driver:location',
      'driver:status',
      'ride:status',
      'ride:accepted',
      'ride:arrived',
      'ride:started',
      'ride:completed',
      'ride:cancelled',
      'coupon:low',
      'coupon:empty',
    ] as const;
    events.forEach((ev) => socket.on(ev, refresh));
    const poll = setInterval(() => load(), 5000);
    return () => {
      if (t) clearTimeout(t);
      events.forEach((ev) => socket.off(ev, refresh));
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter by name, phone, and license plate
  const visible = drivers.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.name ?? '').toLowerCase().includes(q) ||
      (d.phone ?? '').toLowerCase().includes(q) ||
      (d.licensePlate ?? '').toLowerCase().includes(q)
    );
  });

  const statusBadge = (s: string) =>
    ({ available: 'bg-[#10B981] text-white', busy: 'bg-[#EF4444] text-white', offline: 'bg-[#6B7280] text-white' } as any)[s] ||
    'bg-gray-500 text-white';
  const couponBadge = (b: number) => (b < 15 ? 'bg-[#EF4444] text-white' : b < 30 ? 'bg-[#F59E0B] text-white' : 'bg-[#10B981] text-white');

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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-1">{t('drivers.title', 'Driver Management')}</h2>
          <p className="text-muted-foreground">{t('drivers.subtitle', 'Manage your driver fleet')}</p>
        </div>
        <div className="flex items-center gap-2 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded-full px-3 py-1 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span>{t('drivers.liveRefreshing', 'Live Auto-Refreshing')}</span>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('drivers.searchPlaceholder', 'Search by name, phone, vehicle, plate…')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
                <UserPlus className="w-4 h-4 mr-2" /> {t('drivers.addButton', 'Add New Driver')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{t('drivers.addTitle', 'Add New Driver')}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-2"><Label>{t('drivers.fullName', 'Full Name *')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t('drivers.phone', 'Phone Number')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0911…" /></div>
                  <div className="space-y-2"><Label>{t('drivers.email', 'Email *')}</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@…" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('drivers.vehicleType', 'Vehicle Type')}</Label>
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
                  <div className="space-y-2"><Label>{t('drivers.vehicleModel', 'Vehicle Model')}</Label><Input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Toyota Corolla" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t('drivers.licensePlate', 'License Plate')}</Label><Input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="AA-12345" /></div>
                  <div className="space-y-2"><Label>{t('drivers.licenseNumber', 'License Number *')}</Label><Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-…" /></div>
                </div>
                <div className="space-y-2"><Label>{t('drivers.initialCouponBalance', 'Initial Coupon Balance')}</Label><Input type="number" value={form.couponBalance} onChange={(e) => setForm({ ...form, couponBalance: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAddOpen(false)}>{t('drivers.cancel', 'Cancel')}</Button>
                <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleAdd} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('drivers.save', 'Add Driver')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow-sm border border-border p-4"><p className="text-sm text-muted-foreground mb-1">{t('drivers.totalDrivers', 'Total Drivers')}</p><p className="text-3xl font-semibold text-foreground">{drivers.length}</p></div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4"><p className="text-sm text-muted-foreground mb-1">{t('drivers.available', 'Available')}</p><p className="text-3xl font-semibold text-[#10B981]">{drivers.filter((d) => d.status === 'available').length}</p></div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4"><p className="text-sm text-muted-foreground mb-1">{t('drivers.busy', 'Busy')}</p><p className="text-3xl font-semibold text-[#EF4444]">{drivers.filter((d) => d.status === 'busy').length}</p></div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="font-semibold">{t('drivers.driverName', 'Driver Name')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.phone', 'Phone')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.vehicle', 'Vehicle')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.licensePlate', 'License Plate')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.couponBalance', 'Coupon Balance')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.status', 'Status')}</TableHead>
                <TableHead className="font-semibold">{t('drivers.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.vehicleType ?? d.vehicleModel ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.licensePlate}</TableCell>
                  <TableCell><Badge className={couponBadge(d.couponBalance)}>{d.couponBalance} {t('drivers.coupons', 'coupons')}</Badge></TableCell>
                  <TableCell><Badge className={statusBadge(d.status)}>{d.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${d.id}`)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Edit className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && visible.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground">{t('drivers.noDrivers', 'No drivers found')}</p></div>}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{t('drivers.edit', 'Edit Driver')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2"><Label>{t('drivers.fullName', 'Full Name')}</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.phone', 'Phone')}</Label><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.vehicleModel', 'Vehicle Model')}</Label><Input value={edit.vehicleModel} onChange={(e) => setEdit({ ...edit, vehicleModel: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.licensePlate', 'License Plate')}</Label><Input value={edit.licensePlate} onChange={(e) => setEdit({ ...edit, licensePlate: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t('drivers.commission', 'Tokuma Commission (%)')}</Label><Input type="number" value={edit.commissionPercent} onChange={(e) => setEdit({ ...edit, commissionPercent: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditing(null)}>{t('drivers.cancel', 'Cancel')}</Button>
            <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('drivers.update', 'Update Driver')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
