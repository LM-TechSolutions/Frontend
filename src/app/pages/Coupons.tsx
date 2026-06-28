import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Phone, Car, Search, Wallet, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { api } from '../lib/api';

const couponBadge = (b: number) =>
  b < 15
    ? 'bg-[#EF4444] text-white'
    : b < 30
    ? 'bg-[#F59E0B] text-white'
    : 'bg-[#10B981] text-white';

const statusBadge = (s: string) =>
  ({ available: 'bg-[#10B981] text-white', busy: 'bg-[#EF4444] text-white', offline: 'bg-[#6B7280] text-white' } as any)[s] ||
  'bg-gray-500 text-white';

export default function Coupons() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refillDriver, setRefillDriver] = useState<any | null>(null);
  const [refillAmount, setRefillAmount] = useState('');
  const [saving, setSaving] = useState(false);

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
  }, []);

  // Client-side filter by name, license plate, and phone
  const visible = drivers.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.name ?? '').toLowerCase().includes(q) ||
      (d.licensePlate ?? '').toLowerCase().includes(q) ||
      (d.phone ?? '').toLowerCase().includes(q)
    );
  });

  const handleRefill = async () => {
    const amount = parseInt(refillAmount);
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount');
    if (!refillDriver) return;
    setSaving(true);
    try {
      await api.coupons.refill(refillDriver.id, amount, 'Manual refill');
      toast.success(`Added ${amount} coupons to ${refillDriver.name}`);
      setRefillDriver(null);
      setRefillAmount('');
      // Update balance locally so the card reflects it immediately
      setDrivers((prev) =>
        prev.map((d) => (d.id === refillDriver.id ? { ...d, couponBalance: (d.couponBalance ?? 0) + amount } : d))
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Refill failed');
    } finally {
      setSaving(false);
    }
  };

  const closeRefill = () => {
    setRefillDriver(null);
    setRefillAmount('');
  };

  // Summary stats
  const lowBalance = drivers.filter((d) => (d.couponBalance ?? 0) < 15).length;
  const totalCoupons = drivers.reduce((s, d) => s + (d.couponBalance ?? 0), 0);

  if (loading) {
    return <div className="p-6 flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Coupon Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage driver coupon balances</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Drivers', value: drivers.length, color: '#00BDC3', icon: Car },
          { label: 'Total Coupons', value: totalCoupons, color: '#10B981', icon: Wallet },
          { label: 'Low Balance', value: lowBalance, color: '#EF4444', icon: AlertTriangle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${s.color}1a` }}>
                  <s.icon className="w-6 h-6" style={{ color: s.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, plate number, or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Driver Cards */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((d) => {
            const balance = d.couponBalance ?? 0;
            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#00BDC3]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-[#00BDC3]">
                          {String(d.name).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{d.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{d.vehicleType ?? '—'}</p>
                      </div>
                    </div>
                    <Badge className={statusBadge(d.status)}>{d.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{d.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="w-4 h-4 flex-shrink-0" />
                    <span>{d.licensePlate}</span>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Coupon Balance</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-foreground">{balance}</span>
                          <Badge className={couponBadge(balance)}>
                            {balance < 15 ? 'Low' : balance < 30 ? 'Moderate' : 'Good'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                      size="sm"
                      onClick={() => setRefillDriver(d)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Refill Coupons
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No drivers found</p>
        </div>
      )}

      {/* Refill Dialog */}
      <Dialog open={!!refillDriver} onOpenChange={(open) => !open && closeRefill()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Refill Coupons — {refillDriver?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{refillDriver?.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plate</p>
                <p className="font-medium text-foreground">{refillDriver?.licensePlate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold text-foreground">{refillDriver?.couponBalance ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge className={statusBadge(refillDriver?.status ?? '')}>{refillDriver?.status}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount to Add</Label>
              <Input
                type="number"
                value={refillAmount}
                onChange={(e) => setRefillAmount(e.target.value)}
                placeholder="Enter number of coupons"
                min="1"
                autoFocus
              />
            </div>

            {refillAmount && parseInt(refillAmount) > 0 && (
              <div className="bg-[#00BDC3]/10 border border-[#00BDC3]/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-1">New Balance</p>
                <p className="text-xl font-bold text-[#00BDC3]">
                  {(refillDriver?.couponBalance ?? 0) + parseInt(refillAmount)} coupons
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={closeRefill}>Cancel</Button>
            <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleRefill} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirm Refill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
