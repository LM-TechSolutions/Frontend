import { useState } from 'react';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { mockDrivers, mockCouponTransactions, getCouponTransactionsByDriver } from '../data/mockData';
import { Driver, CouponTransaction } from '../types';
import { toast } from 'sonner';

export default function Coupons() {
  const [drivers] = useState<Driver[]>(mockDrivers);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [transactions, setTransactions] = useState<CouponTransaction[]>(mockCouponTransactions);
  const [refillOpen, setRefillOpen] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const driverTransactions = transactions.filter(t => t.driverId === selectedDriverId);

  const handleRefill = () => {
    const amount = parseInt(refillAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newTransaction: CouponTransaction = {
      id: `t${transactions.length + 1}`,
      driverId: selectedDriverId,
      amount: amount,
      type: 'purchase',
      date: new Date(),
      balance: (selectedDriver?.couponBalance || 0) + amount
    };

    setTransactions([newTransaction, ...transactions]);
    setRefillOpen(false);
    setRefillAmount('');
    toast.success(`Successfully added ${amount} coupons to ${selectedDriver?.name}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#111827] mb-1">Coupon Management</h2>
        <p className="text-[#6B7280]">Manage driver coupon balances and transactions</p>
      </div>

      {/* Driver Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 mb-6">
        <div className="flex gap-4 items-center">
          <Label className="font-semibold text-[#111827] whitespace-nowrap">Select Driver:</Label>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Choose a driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name} - {driver.vehicle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDriver && (
        <>
          {/* Driver Info Card */}
          <Card className="mb-6 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Driver Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Driver Name</p>
                  <p className="font-semibold text-[#111827]">{selectedDriver.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Phone</p>
                  <p className="font-semibold text-[#111827]">{selectedDriver.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">Vehicle</p>
                  <p className="font-semibold text-[#111827]">{selectedDriver.vehicle}</p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280] mb-1">License Plate</p>
                  <p className="font-semibold text-[#111827]">{selectedDriver.licensePlate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Balance Card */}
          <Card className="mb-6 shadow-sm border-2 border-[#00BDC3]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280] mb-2">Current Coupon Balance</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-5xl font-bold text-[#111827]">{selectedDriver.couponBalance}</p>
                    <p className="text-xl text-[#6B7280]">coupons</p>
                  </div>
                  {selectedDriver.couponBalance < 15 && (
                    <Badge className="mt-3 bg-[#EF4444] text-white">Low Balance Warning</Badge>
                  )}
                  {selectedDriver.couponBalance >= 15 && selectedDriver.couponBalance < 30 && (
                    <Badge className="mt-3 bg-[#F59E0B] text-white">Moderate Balance</Badge>
                  )}
                  {selectedDriver.couponBalance >= 30 && (
                    <Badge className="mt-3 bg-[#10B981] text-white">Good Balance</Badge>
                  )}
                </div>
                <Dialog open={refillOpen} onOpenChange={setRefillOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white h-12 px-6">
                      <Plus className="w-5 h-5 mr-2" />
                      Refill Coupons
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Refill Coupons</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Driver</Label>
                        <p className="font-medium text-[#111827]">{selectedDriver.name}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Current Balance</Label>
                        <p className="text-2xl font-bold text-[#111827]">{selectedDriver.couponBalance} coupons</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount to Add</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={refillAmount}
                          onChange={(e) => setRefillAmount(e.target.value)}
                          placeholder="Enter number of coupons"
                          min="1"
                        />
                      </div>
                      {refillAmount && parseInt(refillAmount) > 0 && (
                        <div className="bg-[#F9FAFB] p-3 rounded-lg">
                          <p className="text-sm text-[#6B7280] mb-1">New Balance</p>
                          <p className="text-xl font-bold text-[#00BDC3]">
                            {selectedDriver.couponBalance + parseInt(refillAmount)} coupons
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setRefillOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                        onClick={handleRefill}
                      >
                        Confirm Refill
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB]">
                      <TableHead className="font-semibold">Date & Time</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Ride ID</TableHead>
                      <TableHead className="font-semibold">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverTransactions.length > 0 ? (
                      driverTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-[#F9FAFB]">
                          <TableCell className="text-sm text-[#6B7280]">
                            {format(transaction.date, 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {transaction.type === 'purchase' ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                                  <span className="text-[#10B981] font-medium">Purchase</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                                  <span className="text-[#EF4444] font-medium">Deduction</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              transaction.amount > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-[#6B7280]">
                            {transaction.rideId ? `#${transaction.rideId}` : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-[#111827]">
                            {transaction.balance} coupons
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-[#6B7280]">
                          No transactions found for this driver
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDriver && (
        <div className="text-center py-12">
          <p className="text-[#6B7280]">Please select a driver to view their coupon information</p>
        </div>
      )}
    </div>
  );
}
