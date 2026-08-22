import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Languages, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, type Language } from '../contexts/AppContext';

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

/**
 * Coupon economy controls.
 *
 * The deduction mode is the consequential one: it decides whether a completed
 * ride costs the driver a fixed number of coupons, a percentage of the fare, or
 * both — so it gets an explanation rather than a bare dropdown.
 */
const DEDUCTION_MODES = [
  {
    value: 'flat',
    title: 'Fixed coupons',
    description: 'Every completed ride costs the same number of coupons, whatever the fare.',
  },
  {
    value: 'commission',
    title: 'Commission only',
    description: 'Each ride charges the Tokuma commission percentage of the fare instead.',
  },
  {
    value: 'both',
    title: 'Both',
    description: 'The fixed coupons come off first, then the commission on top.',
  },
];

const COUPON_NUMERIC: { key: string; label: string; hint: string }[] = [
  {
    key: 'coupon.perRideDeduction',
    label: 'Coupons per completed ride',
    hint: 'Deducted automatically when a driver ends a trip.',
  },
  {
    key: 'coupon.operatorLowBalanceThreshold',
    label: 'Operator low-stock warning',
    hint: 'Inventory level at which an operator is prompted to restock.',
  },
];

const COUPON_TOGGLES: { key: string; label: string; hint: string }[] = [
  {
    key: 'coupon.blockAcceptBelowMinimum',
    label: 'Block accepting when underfunded',
    hint: 'A driver who cannot cover the minimum plus the ride deduction is stopped from accepting.',
  },
  {
    key: 'coupon.driverRequestEnabled',
    label: 'Let drivers request refills',
    hint: 'Drivers can ask an operator for coupons from the mobile app, and a request is raised automatically when they run dry.',
  },
];

const COUPON_KEYS = [
  'coupon.deductionMode',
  ...COUPON_NUMERIC.map((f) => f.key),
  ...COUPON_TOGGLES.map((f) => f.key),
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
      [...EDITABLE.map((f) => f.key), ...COUPON_KEYS].forEach((key) => {
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

        {/* Coupon economy — how a completed ride is charged. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#00BDC3]" /> Coupon economy
            </CardTitle>
            <CardDescription>
              What every completed ride costs a driver, and how they get more coupons
              {role !== 'admin' ? ' (read-only — admin access required to edit)' : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Deduction mode</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {DEDUCTION_MODES.map((mode) => {
                      const selected = (values['coupon.deductionMode'] ?? 'flat') === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          disabled={role !== 'admin'}
                          onClick={() => setValues({ ...values, 'coupon.deductionMode': mode.value })}
                          className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                            selected
                              ? 'border-[#00BDC3] bg-[#00BDC3]/10 ring-2 ring-[#00BDC3]/25'
                              : 'border-border hover:border-[#00BDC3]/50 hover:bg-muted/50'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">{mode.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {COUPON_NUMERIC.map((field) => (
                    <div className="space-y-2" key={field.key}>
                      <Label>{field.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        className="tabular-nums"
                        value={values[field.key] ?? ''}
                        disabled={role !== 'admin'}
                        onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {COUPON_TOGGLES.map((field) => {
                    const on = values[field.key] === 'true';
                    return (
                      <div
                        key={field.key}
                        className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>
                        </div>
                        <Switch
                          checked={on}
                          disabled={role !== 'admin'}
                          onCheckedChange={(checked) =>
                            setValues({ ...values, [field.key]: checked ? 'true' : 'false' })
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Resolve the settings into the sentence they actually mean. */}
                <div className="rounded-xl border border-[#00BDC3]/30 bg-[#00BDC3]/10 p-4">
                  <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">Effect on a completed ride</p>
                  <p className="mt-1.5 text-sm text-foreground">{describeDeduction(values)}</p>
                </div>

                {role === 'admin' && (
                  <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save coupon settings
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

/** Turn the coupon settings into the sentence an administrator can check. */
function describeDeduction(values: Record<string, string>): string {
  const mode = values['coupon.deductionMode'] ?? 'flat';
  const perRide = Number(values['coupon.perRideDeduction'] ?? 1);
  const commission = Number(values['commission.defaultPercent'] ?? 10);
  const minBalance = Number(values['coupon.minBalanceThreshold'] ?? 10);
  const blocks = values['coupon.blockAcceptBelowMinimum'] !== 'false';

  const charge =
    mode === 'commission'
      ? `${commission}% of the fare is deducted as commission`
      : mode === 'both'
      ? `${perRide} coupon${perRide === 1 ? '' : 's'} plus ${commission}% of the fare are deducted`
      : `${perRide} coupon${perRide === 1 ? '' : 's'} ${perRide === 1 ? 'is' : 'are'} deducted`;

  const gate = blocks
    ? ` Drivers below ${minBalance + (mode === 'commission' ? 0 : perRide)} coupons cannot accept a new ride.`
    : ' Drivers are not blocked from accepting when underfunded.';

  return `${charge} from the driver's wallet.${gate}`;
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
