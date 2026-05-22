import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Car, Clock, Mail, Phone, Shield, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { getDriverById, getOperatorById } from '../data/mockData';
import { useAppContext } from '../contexts/AppContext';
import { format } from 'date-fns';

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const driver = useMemo(() => (employeeId ? getDriverById(employeeId) : undefined), [employeeId]);
  const operator = useMemo(() => (employeeId ? getOperatorById(employeeId) : undefined), [employeeId]);

  const employee = driver || operator;
  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-[#6B7280]">Employee not found</p>
          <Button
            className="mt-4 bg-[#00BDC3] hover:bg-[#009EA3] text-white"
            onClick={() => navigate('/dashboard')}
          >
            {t('rides.backToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  const isDriver = Boolean(driver);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">{employee.name}</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {isDriver ? t('nav.drivers') : t('nav.operators')} • {employee.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t('common.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#00BDC3]/10 flex items-center justify-center text-[#00BDC3]">
                {employee.name
                  .split(' ')
                  .map((item) => item[0])
                  .join('')}
              </div>
              <div>
                <p className="font-semibold text-[#111827]">{employee.name}</p>
                <p className="text-sm text-[#6B7280]">{employee.phone}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-[#6B7280]">{t('common.account')}</p>
                <p className="font-semibold text-[#111827]">{isDriver ? 'Driver Account' : 'Operator Account'}</p>
              </div>
              {operator && (
                <div>
                  <p className="text-sm text-[#6B7280]">Email</p>
                  <p className="font-semibold text-[#111827]">{operator.email}</p>
                </div>
              )}
              {driver && (
                <div>
                  <p className="text-sm text-[#6B7280]">{t('drivers.vehicle')}</p>
                  <p className="font-semibold text-[#111827]">{driver.vehicle}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('common.viewDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-[#6B7280]">{t('common.phone')}</p>
                <p className="font-semibold text-[#111827]">{employee.phone}</p>
              </div>
              {operator && (
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">Shift</p>
                  <p className="font-semibold text-[#111827]">{operator.shift}</p>
                </div>
              )}
              {driver && (
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">{t('drivers.licensePlate')}</p>
                  <p className="font-semibold text-[#111827]">{driver.licensePlate}</p>
                </div>
              )}
              {operator && (
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">Joined</p>
                  <p className="font-semibold text-[#111827]">{format(operator.joinedDate, 'MMM dd, yyyy')}</p>
                </div>
              )}
              {driver && (
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">Coupon Balance</p>
                  <p className="font-semibold text-[#111827]">{driver.couponBalance} coupons</p>
                </div>
              )}
            </div>
            {isDriver && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">Status</p>
                  <Badge className={
                    driver.status === 'available'
                      ? 'bg-[#10B981] text-white'
                      : driver.status === 'busy'
                      ? 'bg-[#EF4444] text-white'
                      : 'bg-[#6B7280] text-white'
                  }>
                    {driver.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-[#6B7280]">Location</p>
                  <p className="font-semibold text-[#111827]">{driver.location.lat.toFixed(3)}, {driver.location.lng.toFixed(3)}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={() => navigate('/drivers')}>
                {t('nav.drivers')}
              </Button>
              <Button variant="outline" className="border-[#E5E7EB] text-[#111827]" onClick={() => navigate('/operators')}>
                {t('nav.operators')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
