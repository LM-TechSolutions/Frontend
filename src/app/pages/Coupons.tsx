import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Plus, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { api } from '../lib/api';

const isCredit = (type: string) => type === 'refill' || type === 'topup' || type === 'refund';

export default function Coupons() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [refillOpen, setRefillOpen] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.drivers
      .list({ limit: 200 })
      .then((res) => {
        setDrivers(res.drivers ?? []);
        if (res.drivers?.[0]) setSelectedDriverId(res.drivers[0].id);
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load drivers'))
      .finally(() => setLoading(false));
  }, []);

  const loadDriverData = async (driverId: string) => {
    if (!driverId) return;
    setTxLoading(true);
    try {
      const [bal, tx] = await Promise.all([
        api.coupons.balance(driverId).catch(() => null),
        api.coupons.list({ driverId, limit: 100 }).catch(() => ({ transactions: [] })),
      ]);
      setBalance(bal);
      setTransactions(tx.transactions ?? []);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDriverId) loadDriverData(selectedDriverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId]);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const currentBalance = balance?.balance ?? selectedDriver?.couponBalance ?? 0;

  const handleRefill = async () => {
    const amount = parseInt(refillAmount);
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount');
    setSaving(true);
    try {
      await api.coupons.refill(selectedDriverId, amount, 'Manual refill');
      toast.success(`Added ${amount} coupons to ${selectedDriver?.name}`);
      setRefillOpen(false);
      setRefillAmount('');
      loadDriverData(selectedDriverId);
    } catch (e: any) {
      toast.error(e?.message ?? 'Refill failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-1">Coupon Management</h2>
        <p className="text-muted-foreground">Manage driver coupon balances and transactions</p>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
        <div className="flex gap-4 items-center">
          <Label className="font-semibold text-foreground whitespace-nowrap">Select Driver:</Label>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Choose a driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name} - {d.vehicleType ?? ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDriver ? (
        <>
          <Card className="mb-6 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg">Driver Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div><p className="text-sm text-muted-foreground mb-1">Driver Name</p><p className="font-semibold text-card-foreground">{selectedDriver.name}</p></div>
                <div><p className="text-sm text-muted-foreground mb-1">Phone</p><p className="font-semibold text-card-foreground">{selectedDriver.phone}</p></div>
                <div><p className="text-sm text-muted-foreground mb-1">Vehicle</p><p className="font-semibold text-card-foreground">{selectedDriver.vehicleType ?? '—'}</p></div>
                <div><p className="text-sm text-muted-foreground mb-1">License Plate</p><p className="font-semibold text-card-foreground">{selectedDriver.licensePlate}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 shadow-sm border-2 border-[#00BDC3]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Coupon Balance</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-5xl font-bold text-card-foreground">{currentBalance}</p>
                    <p className="text-xl text-muted-foreground">coupons</p>
                  </div>
                  {currentBalance < 15 ? <Badge className="mt-3 bg-[#EF4444] text-white">Low Balance Warning</Badge>
                    : currentBalance < 30 ? <Badge className="mt-3 bg-[#F59E0B] text-white">Moderate Balance</Badge>
                    : <Badge className="mt-3 bg-[#10B981] text-white">Good Balance</Badge>}
                </div>
                <Dialog open={refillOpen} onOpenChange={setRefillOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white h-12 px-6"><Plus className="w-5 h-5 mr-2" /> Refill Coupons</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>Refill Coupons</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Driver</Label><p className="font-medium text-foreground">{selectedDriver.name}</p></div>
                      <div className="space-y-2"><Label>Current Balance</Label><p className="text-2xl font-bold text-foreground">{currentBalance} coupons</p></div>
                      <div className="space-y-2"><Label>Amount to Add</Label><Input type="number" value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} placeholder="Enter number of coupons" min="1" /></div>
                      {refillAmount && parseInt(refillAmount) > 0 && (
                        <div className="bg-muted p-3 rounded-lg"><p className="text-sm text-muted-foreground mb-1">New Balance</p><p className="text-xl font-bold text-[#00BDC3]">{currentBalance + parseInt(refillAmount)} coupons</p></div>
                      )}
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setRefillOpen(false)}>Cancel</Button>
                      <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleRefill} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirm Refill
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-lg">Transaction History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="font-semibold">Date & Time</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                      <TableHead className="font-semibold">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#00BDC3] inline" /></TableCell></TableRow>
                    ) : transactions.length > 0 ? (
                      transactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/50">
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(t.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isCredit(t.type) ? <TrendingUp className="w-4 h-4 text-[#10B981]" /> : <TrendingDown className="w-4 h-4 text-[#EF4444]" />}
                              <span className={`font-medium capitalize ${isCredit(t.type) ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{t.type}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className={`font-semibold ${isCredit(t.type) ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{isCredit(t.type) ? '+' : '-'}{Math.abs(t.amount)}</span></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.notes ?? '-'}</TableCell>
                          <TableCell className="font-medium text-foreground">{t.balance} coupons</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions found for this driver</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12"><p className="text-muted-foreground">No drivers yet — add a driver first.</p></div>
      )}
    </div>
  );
}
