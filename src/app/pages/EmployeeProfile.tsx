import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { formatETB } from '../lib/format';

const statusBadge = (s: string) =>
  ({ available: 'bg-[#10B981] text-white', busy: 'bg-[#EF4444] text-white', offline: 'bg-[#6B7280] text-white' } as any)[s] ||
  'bg-gray-500 text-white';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    api.drivers
      .get(employeeId)
      .then(setDriver)
      .catch(() => setDriver(null))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return <div className="p-6 flex justify-center h-[60vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#00BDC3]" /></div>;
  }

  if (!driver) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Driver not found</p>
          <Button className="mt-4 bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => navigate('/drivers')}>Back to Drivers</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/drivers')}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{driver.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Driver • #{String(driver.id).slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#00BDC3]/10 flex items-center justify-center text-[#00BDC3] font-semibold">
                {String(driver.name).split(' ').map((i: string) => i[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-card-foreground">{driver.name}</p>
                <p className="text-sm text-muted-foreground">{driver.phone}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold text-card-foreground">{driver.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusBadge(driver.status)}>{driver.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coupon Balance</p>
                <p className="font-semibold text-card-foreground">{driver.couponBalance} coupons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm xl:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Type</p>
                <p className="font-semibold text-card-foreground capitalize">{driver.vehicleType ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Model</p>
                <p className="font-semibold text-card-foreground">{driver.vehicleModel ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License Plate</p>
                <p className="font-semibold text-card-foreground">{driver.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-semibold text-card-foreground">{driver.licenseNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-semibold text-card-foreground">{driver.rating ?? '—'} ★</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Rides</p>
                <p className="font-semibold text-card-foreground">{driver.completedRides ?? driver.totalRides ?? 0}</p>
              </div>
              {driver.currentLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Location</p>
                  <p className="font-semibold text-card-foreground">{driver.currentLocation.lat.toFixed(3)}, {driver.currentLocation.lng.toFixed(3)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Tokuma Commission</p>
                <p className="font-semibold text-card-foreground">{driver.commissionPercent ?? 10}%</p>
              </div>
            </div>
            <div className="mt-6">
              <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => navigate('/coupons')}>Manage Coupons</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
