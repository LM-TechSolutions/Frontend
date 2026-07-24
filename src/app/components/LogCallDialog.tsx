import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PhoneCall, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';

const empty = { customerPhone: '', customerName: '', durationMinutes: '', status: 'completed', notes: '' };

/** Lets an operator record a call (esp. missed/abandoned ones that don't become rides). */
export default function LogCallDialog({ onLogged, className }: { onLogged?: () => void; className?: string }) {
  const { t } = useAppContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  const submit = async () => {
    if (!form.customerPhone) {
      toast.error('Customer phone is required');
      return;
    }
    setSaving(true);
    try {
      await api.callLogs.create({
        customerPhone: form.customerPhone,
        customerName: form.customerName || undefined,
        duration: Math.round((parseFloat(form.durationMinutes) || 0) * 60),
        status: form.status,
        notes: form.notes || undefined,
        rideCreated: false,
      });
      toast.success('Call logged');
      setForm(empty);
      setOpen(false);
      onLogged?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to log call');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className ?? ''}`}>
          <PhoneCall className="w-4 h-4" /> {t('dashboard.logCall', 'Log Call')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>{t('dashboard.logCallTitle', 'Log a Call')}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>{t('dashboard.customerPhone', 'Customer Phone *')}</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="0911 234567" /></div>
          <div className="space-y-2"><Label>{t('dashboard.customerName', 'Customer Name')}</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder={t('common.optional', 'Optional')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{t('dashboard.durationMinutes', 'Duration (minutes)')}</Label><Input type="number" min="0" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} placeholder="0" /></div>
            <div className="space-y-2">
              <Label>{t('dashboard.outcome', 'Outcome')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">{t('dashboard.completed', 'Completed')}</SelectItem>
                  <SelectItem value="missed">{t('dashboard.missed', 'Missed')}</SelectItem>
                  <SelectItem value="abandoned">{t('dashboard.abandoned', 'Abandoned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{t('dashboard.notes', 'Notes')}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('common.optional', 'Optional')} /></div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('dashboard.saveCall', 'Save Call')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
