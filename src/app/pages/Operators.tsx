import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Phone, Mail, PhoneCall, Users, Plus, Search, UserCog, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';

const statusColor = (active: boolean) => (active ? 'bg-[#10B981] text-white' : 'bg-[#6B7280] text-white');

export default function Operators() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    try {
      const res = await api.operators.list({ limit: 200, search: searchQuery || undefined });
      setOperators(res.operators ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const onlineCount = operators.filter((o) => o.status === 'active').length;
  const totalCalls = operators.reduce((s, o) => s + (o.totalCalls ?? 0), 0);
  const totalCustomers = operators.reduce((s, o) => s + (o.totalRidesCreated ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Operators Management</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage call center operators and track performance</p>
        </div>
        <AddOperatorDialog onCreated={load} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Operators', value: operators.length, icon: UserCog, color: '#00BDC3' },
          { label: 'Online Now', value: onlineCount, icon: Users, color: '#10B981' },
          { label: 'Total Rides Created', value: totalCustomers, icon: Users, color: '#00BDC3' },
          { label: 'Total Calls', value: totalCalls, icon: PhoneCall, color: '#00BDC3' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-[#6B7280]">{s.label}</p><p className="text-2xl font-semibold mt-1" style={{ color: s.color }}>{s.value}</p></div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${s.color}1a` }}><s.icon className="w-6 h-6" style={{ color: s.color }} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input placeholder="Search by name, email, or phone…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {operators.map((op) => (
            <Card key={op.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-[#00BDC3]">{String(op.name).split(' ').map((n: string) => n[0]).join('')}</span>
                    </div>
                    <div><CardTitle className="text-base">{op.name}</CardTitle><p className="text-xs text-[#6B7280] mt-1 capitalize">{op.shift}</p></div>
                  </div>
                  <Badge className={statusColor(op.status === 'active')}>{op.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#6B7280]"><Mail className="w-4 h-4" /><span>{op.email}</span></div>
                <div className="flex items-center gap-2 text-sm text-[#6B7280]"><Phone className="w-4 h-4" /><span>{op.phone}</span></div>
                <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-[#6B7280]">Total Calls</p><p className="font-semibold text-[#111827]">{(op.totalCalls ?? 0).toLocaleString()}</p></div>
                  <div><p className="text-[#6B7280]">Rides Created</p><p className="font-semibold text-[#111827]">{(op.totalRidesCreated ?? 0).toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && operators.length === 0 && (
        <div className="text-center py-12"><Users className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" /><p className="text-[#6B7280]">No operators found</p></div>
      )}
    </div>
  );
}

function AddOperatorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shift: 'morning' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error('Name, email, phone and password are required');
      return;
    }
    setSaving(true);
    try {
      await api.operators.create(form);
      toast.success('Operator added');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', password: '', shift: 'morning' });
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add operator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"><Plus className="w-4 h-4 mr-2" /> Add Operator</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>Add New Operator</DialogTitle><DialogDescription>Add a new call center operator to the system</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@tokuma.et" required /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0911 123456" required /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required /></div>
          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#00BDC3] hover:bg-[#009EA3] text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Add Operator
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
