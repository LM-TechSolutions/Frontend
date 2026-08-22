import { useEffect, useState } from 'react';
import { Phone, Mail, PhoneCall, Users, Plus, Search, UserCog, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, FilterBar } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { EmptyState, Initials, StatTile, timeAgo } from '../components/coupons/CouponAtoms';

function onShift(shift: string) {
  const hour = new Date().getHours();
  if (shift === 'morning') return hour >= 6 && hour < 14;
  if (shift === 'afternoon') return hour >= 14 && hour < 22;
  if (shift === 'night') return hour >= 22 || hour < 6;
  return false;
}

export default function Operators() {
  const { t } = useAppContext();
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [removing, setRemoving] = useState<any | null>(null);

  const load = async () => {
    try {
      const res = await api.operators.list({ limit: 200 });
      setOperators(res.operators ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? t('operators.loadFailed', 'Failed to load operators'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = operators.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.name ?? '').toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.phone ?? '').toLowerCase().includes(q)
    );
  });

  const onlineCount = operators.filter((o) => o.status === 'active').length;
  const totalCalls = operators.reduce((s, o) => s + (o.totalCalls ?? 0), 0);
  const totalCustomers = operators.reduce((s, o) => s + (o.totalRidesCreated ?? 0), 0);
  const conversion = totalCalls ? Math.round((totalCustomers / totalCalls) * 100) : 0;

  const handleDelete = async () => {
    if (!removing) return;
    try {
      await api.operators.remove(removing.id);
      toast.success(t('operators.removed', '{name} removed', { name: removing.name }));
      setRemoving(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('operators.deleteFailed', 'Could not delete operator'));
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow={t('operators.eyebrow', 'Staff')}
        title={t('operators.title', 'Operators')}
        actions={<AddOperatorDialog onCreated={load} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('operators.totalOperators', 'Total operators')} value={operators.length} icon={UserCog} />
        <StatTile label={t('operators.onlineNow', 'Active accounts')} value={onlineCount} icon={Users} accent="#0B7A55" />
        <StatTile label={t('operators.totalRidesCreated', 'Rides created')} value={totalCustomers} icon={Users} />
        <StatTile label={t('operators.callToRide', 'Call to ride')} value={`${conversion}%`} hint={t('operators.loggedCalls', '{count} logged calls', { count: totalCalls })} icon={PhoneCall} />
      </div>

      <FilterBar>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('operators.searchPlaceholder', 'Search by name, email, or phone…')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 pl-10" />
        </div>
      </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Users} title={t('operators.noOperators', 'No operators found')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((op) => {
            const calls = op.totalCalls ?? 0;
            const rides = op.totalRidesCreated ?? 0;
            const rate = calls ? Math.round((rides / calls) * 100) : rides ? 100 : 0;
            const working = onShift(op.shift);
            return (
              <article key={op.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,26,27,.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Initials name={op.name} />
                    <div>
                      <p className="font-semibold">{op.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{t('operators.shiftNamed', '{shift} shift', { shift: t(`operators.${op.shift}`, op.shift) })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={op.status === 'active' ? 'active' : 'inactive'} label={op.status === 'active' ? t('operators.active', 'Active') : t('operators.inactive', 'Inactive')} />
                    <span className={`text-[12px] font-medium ${working ? 'text-[color:var(--success)]' : 'text-muted-foreground'}`}>
                      {working ? t('operators.onShift', 'On shift') : t('operators.offShift', 'Off shift')}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {op.email}</p>
                  <a href={`tel:${op.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-4 w-4" /> {op.phone}
                  </a>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('operators.calls', 'Calls')}</p>
                    <p className="font-semibold tabular-nums">{calls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('operators.rides', 'Rides')}</p>
                    <p className="font-semibold tabular-nums">{rides.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('operators.conversion', 'Conversion')}</p>
                    <p className="font-semibold tabular-nums">{rate}%</p>
                  </div>
                </div>
                {op.lastActive && (
                  <p className="mt-3 text-xs text-muted-foreground">{t('operators.lastActive', 'Last active {time}', { time: timeAgo(op.lastActive) })}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(op)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> {t('common.edit', 'Edit')}
                  </Button>
                  <Button variant="outline" size="sm" className="border-[#AE2E2D]/40 text-[#AE2E2D]" onClick={() => setRemoving(op)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EditOperatorDialog operator={editing} onClose={() => setEditing(null)} onSaved={load} />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('operators.removeTitle', 'Remove {name}?', { name: removing?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('operators.removeBody', 'Their operator profile and login will be deleted. This cannot be undone.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('operators.keep', 'Keep')}</AlertDialogCancel>
            <AlertDialogAction className="bg-[#AE2E2D] text-white hover:bg-[#8f2423]" onClick={handleDelete}>
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function AddOperatorDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useAppContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shift: 'morning' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error(t('operators.requiredFields', 'Name, email, phone and password are required'));
      return;
    }
    setSaving(true);
    try {
      await api.operators.create(form);
      toast.success(t('operators.added', 'Operator added'));
      setOpen(false);
      setForm({ name: '', email: '', phone: '', password: '', shift: 'morning' });
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? t('operators.addFailed', 'Failed to add operator'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> {t('operators.addButton', 'Add operator')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('operators.addNewTitle', 'Add new operator')}</DialogTitle>
          <DialogDescription className="sr-only">{t('operators.addNewDescription', 'Add a call-centre operator')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2"><Label>{t('operators.fullName', 'Full name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>{t('operators.email', 'Email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="space-y-2"><Label>{t('operators.phone', 'Phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
          <div className="space-y-2"><Label>{t('operators.password', 'Password')}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <div className="space-y-2">
            <Label>{t('operators.shift', 'Shift')}</Label>
            <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">{t('operators.morning', 'Morning')}</SelectItem>
                <SelectItem value="afternoon">{t('operators.afternoon', 'Afternoon')}</SelectItem>
                <SelectItem value="night">{t('operators.night', 'Night')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">{t('operators.cancel', 'Cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('operators.addOperator', 'Add operator')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOperatorDialog({
  operator,
  onClose,
  onSaved,
}: {
  operator: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', shift: 'morning', status: 'active' });

  useEffect(() => {
    if (operator) {
      setForm({
        name: operator.name ?? '',
        email: operator.email ?? '',
        phone: operator.phone ?? '',
        shift: operator.shift ?? 'morning',
        status: operator.status ?? 'active',
      });
    }
  }, [operator]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    setSaving(true);
    try {
      await api.operators.update(operator.id, form);
      toast.success(t('operators.updated', 'Operator updated'));
      onClose();
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? t('operators.updateFailed', 'Failed to update operator'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!operator} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('operators.editTitle', 'Edit operator')}</DialogTitle>
          <DialogDescription className="sr-only">{t('operators.editDescription', 'Edit this operator.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-2"><Label>{t('operators.fullName', 'Full name')}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>{t('operators.email', 'Email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>{t('operators.phone', 'Phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('operators.shift', 'Shift')}</Label>
              <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t('operators.morning', 'Morning')}</SelectItem>
                  <SelectItem value="afternoon">{t('operators.afternoon', 'Afternoon')}</SelectItem>
                  <SelectItem value="night">{t('operators.night', 'Night')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('operators.account', 'Account')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('operators.active', 'Active')}</SelectItem>
                  <SelectItem value="inactive">{t('operators.inactive', 'Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('common.save', 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
