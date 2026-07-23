import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, type Language } from '../contexts/AppContext';

// The configurable Tokuma business settings surfaced for editing.
const EDITABLE: { key: string; label: string; hint?: string }[] = [
  { key: 'fare.baseFare', label: 'Base Fare (ETB)' },
  { key: 'fare.perKm', label: 'Per Kilometre (ETB)' },
  { key: 'fare.timeBlockCharge', label: 'Time Block Charge (ETB)' },
  { key: 'fare.timeBlockMinutes', label: 'Time Block (minutes)' },
  { key: 'fare.minimumFare', label: 'Minimum Fare (ETB)' },
  { key: 'dispatch.radiusKm', label: 'Dispatch Radius (km)' },
  { key: 'dispatch.maxDrivers', label: 'Max Drivers Notified' },
  { key: 'dispatch.offerTtlSeconds', label: 'Offer Timeout (seconds)' },
  { key: 'coupon.minBalanceThreshold', label: 'Min Coupon Balance' },
  { key: 'commission.defaultPercent', label: 'Default Commission (%)' },
];

export default function Settings() {
  const { user, role } = useAuth();
  const { t, language, setLanguage } = useAppContext();
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
        <h2 className="text-2xl font-semibold text-foreground mb-1">{t('settings.title')}</h2>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profileSettings')}</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input defaultValue={user?.name ?? ''} readOnly /></div>
              <div className="space-y-2"><Label>Role</Label><Input value={role === 'admin' ? 'Administrator' : 'Call Center'} readOnly /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue={user?.email ?? ''} readOnly /></div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#00BDC3]" /> {t('common.language')}
            </CardTitle>
            <CardDescription>Choose the language used across the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder={t('common.language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">አማርኛ</SelectItem>
                <SelectItem value="om">Oromiffa</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Security: change password + two-factor */}
        <SecurityCard />

        {/* System (Pricing / Dispatch / Commission) */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.systemSettings')}</CardTitle>
            <CardDescription>
              Live Tokuma business rules{role !== 'admin' ? ' (read-only — admin access required to edit)' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {EDITABLE.map(({ key, label }) => (
                    <div className="space-y-2" key={key}>
                      <Label>{label}</Label>
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
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('settings.saveSystem')}
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

function SecurityCard() {
  const { user } = useAuth();
  const { t } = useAppContext();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!user?.twoFactorEnabled);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Fill in your current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Two-factor enable flow: password -> QR/backup codes -> confirm code
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'password' | 'confirm'>('idle');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState('');
  const [busy, setBusy] = useState(false);

  const startEnable = () => setTwoFAStep('password');

  const submitEnablePassword = async () => {
    if (!twoFAPassword) {
      toast.error('Enter your password to continue');
      return;
    }
    setBusy(true);
    try {
      const res = await api.twoFactor.enable(twoFAPassword);
      setQrCodeDataUrl(res.qrCodeDataUrl);
      setTotpURI(res.totpURI);
      setBackupCodes(res.backupCodes ?? []);
      setTwoFAStep('confirm');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to start two-factor setup');
    } finally {
      setBusy(false);
    }
  };

  const submitConfirmCode = async () => {
    if (!confirmCode) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await api.twoFactor.verify(confirmCode);
      toast.success('Two-factor authentication enabled');
      setTwoFactorEnabled(true);
      setTwoFAStep('idle');
      setTwoFAPassword('');
      setConfirmCode('');
      setQrCodeDataUrl(null);
      setTotpURI(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Invalid code — try again');
    } finally {
      setBusy(false);
    }
  };

  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const submitDisable = async () => {
    if (!disablePassword) {
      toast.error('Enter your password to continue');
      return;
    }
    setBusy(true);
    try {
      await api.twoFactor.disable(disablePassword);
      toast.success('Two-factor authentication disabled');
      setTwoFactorEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to disable two-factor authentication');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.security')}</CardTitle>
        <CardDescription>Change your password or add an authenticator-app second factor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Change password */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#00BDC3]" />
            <h4 className="font-semibold text-sm text-card-foreground">{t('settings.changePassword')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button size="sm" className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Update Password
          </Button>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? <ShieldCheck className="w-4 h-4 text-[#10B981]" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
              <h4 className="font-semibold text-sm text-card-foreground">Two-Factor Authentication</h4>
            </div>
            <Badge className={twoFactorEnabled ? 'bg-[#10B981] text-white' : 'bg-gray-500 text-white'}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Protects your account with a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) in addition to your password.
          </p>

          {!twoFactorEnabled && twoFAStep === 'idle' && (
            <Button size="sm" variant="outline" onClick={startEnable}>Enable Two-Factor</Button>
          )}

          {twoFAStep === 'password' && (
            <div className="flex flex-col md:flex-row gap-2 max-w-md">
              <Input
                type="password"
                placeholder="Confirm your password"
                value={twoFAPassword}
                onChange={(e) => setTwoFAPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={submitEnablePassword} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTwoFAStep('idle'); setTwoFAPassword(''); }}>Cancel</Button>
              </div>
            </div>
          )}

          {twoFAStep === 'confirm' && (
            <div className="space-y-4 max-w-md">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt="Two-factor QR code" className="w-40 h-40 rounded-lg border border-border" />
                )}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>1. Scan this QR code with your authenticator app.</p>
                  {totpURI && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[#00BDC3] hover:underline"
                      onClick={() => {
                        navigator.clipboard.writeText(totpURI);
                        toast.info('Setup link copied');
                      }}
                    >
                      <Copy className="w-3 h-3" /> Can't scan? Copy setup link
                    </button>
                  )}
                  <p>2. Enter the 6-digit code it shows below to confirm.</p>
                </div>
              </div>

              {backupCodes.length > 0 && (
                <div className="bg-muted rounded-lg p-3 text-xs">
                  <p className="font-semibold mb-1 text-card-foreground">Backup codes — save these somewhere safe:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-muted-foreground">
                    {backupCodes.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-[0.3em]"
                />
                <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={submitConfirmCode} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </div>
          )}

          {twoFactorEnabled && !showDisable && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowDisable(true)}>
              Disable Two-Factor
            </Button>
          )}

          {twoFactorEnabled && showDisable && (
            <div className="flex flex-col md:flex-row gap-2 max-w-md">
              <Input
                type="password"
                placeholder="Confirm your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={submitDisable} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Disable'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDisable(false); setDisablePassword(''); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
