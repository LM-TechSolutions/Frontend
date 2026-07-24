import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';

// The configurable Tokuma business settings surfaced for editing.
const EDITABLE: { key: string; labelKey: string }[] = [
  { key: 'fare.baseFare', labelKey: 'settings.baseFare' },
  { key: 'fare.perKm', labelKey: 'settings.perKm' },
  { key: 'fare.timeBlockCharge', labelKey: 'settings.timeBlockCharge' },
  { key: 'fare.timeBlockMinutes', labelKey: 'settings.timeBlockMinutes' },
  { key: 'fare.minimumFare', labelKey: 'settings.minimumFare' },
  { key: 'dispatch.radiusKm', labelKey: 'settings.dispatchRadius' },
  { key: 'dispatch.maxDrivers', labelKey: 'settings.maxDriversNotified' },
  { key: 'dispatch.offerTtlSeconds', labelKey: 'settings.offerTimeout' },
  { key: 'coupon.minBalanceThreshold', labelKey: 'settings.minCouponBalance' },
  { key: 'commission.defaultPercent', labelKey: 'settings.defaultCommission' },
];

export default function Settings() {
  const { user, role } = useAuth();
  const { t } = useAppContext();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .getSystem()
      .then((rows) => {
        const map: Record<string, string> = {};
        (rows ?? []).forEach((r: any) => (map[r.key] = String(r.value)));
        setValues(map);
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load system settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      EDITABLE.forEach(({ key }) => {
        if (values[key] !== undefined) payload[key] = values[key];
      });
      await api.settings.updateSystem(payload);
      toast.success('System settings saved');
    } catch (e: any) {
      toast.error(e?.status === 403 ? 'Only admins can change system settings' : e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-1">{t('settings.title', 'Settings')}</h2>
        <p className="text-muted-foreground">{t('settings.subtitle', 'Manage your account and Tokuma system configuration')}</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile', 'Profile')}</CardTitle>
            <CardDescription>{t('settings.yourAccountInfo', 'Your account information')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('settings.name', 'Name')}</Label><Input defaultValue={user?.name ?? ''} readOnly /></div>
              <div className="space-y-2"><Label>{t('settings.role', 'Role')}</Label><Input value={role === 'admin' ? t('settings.administrator', 'Administrator') : t('settings.callCenter', 'Call Center')} readOnly /></div>
            </div>
            <div className="space-y-2"><Label>{t('settings.email', 'Email')}</Label><Input defaultValue={user?.email ?? ''} readOnly /></div>
          </CardContent>
        </Card>

        {/* System (Pricing / Dispatch / Commission) */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.pricingDispatchCommission', 'Pricing, Dispatch & Commission')}</CardTitle>
            <CardDescription>
              {t('settings.businessRules', 'Live Tokuma business rules')}{role !== 'admin' ? ` (${t('settings.readOnly', 'read-only — admin access required to edit')})` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {EDITABLE.map(({ key, labelKey }) => (
                    <div className="space-y-2" key={key}>
                      <Label>{t(labelKey)}</Label>
                      <Input
                        type="number"
                        value={values[key] ?? ''}
                        disabled={role !== 'admin'}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                {role === 'admin' && (
                  <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('settings.saveSettings', 'Save System Settings')}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
