import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Languages, Ticket, MonitorSmartphone, Shield, Bell, User, Wallet, CircleDollarSign, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, type SecurityPolicy, type StaffSession } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, type Language, type CalendarMode } from '../contexts/AppContext';
import { connectSocket, getSocket } from '../lib/socket';
import { NotificationPrefsCard } from '../components/settings/NotificationPrefsCard';
import { withStepUp } from '../components/security/StepUpDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Page, PageHeader } from '../components/layout/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// The configurable Tokuma business settings surfaced for editing.
const EDITABLE: { key: string; labelKey?: string }[] = [
  { key: 'fare.baseFare', labelKey: 'settings.baseFare' },
  { key: 'fare.perKm', labelKey: 'settings.perKm' },
  { key: 'fare.timeBlockCharge', labelKey: 'settings.timeBlockCharge' },
  { key: 'fare.timeBlockMinutes', labelKey: 'settings.timeBlockMinutes' },
  { key: 'fare.minimumFare', labelKey: 'settings.minimumFare' },
  { key: 'fare.currency' },
  { key: 'dispatch.radiusKm', labelKey: 'settings.dispatchRadius' },
  { key: 'dispatch.maxDrivers', labelKey: 'settings.maxDriversNotified' },
  { key: 'dispatch.offerTtlSeconds', labelKey: 'settings.offerTimeout' },
  { key: 'dispatch.enforceRadius' },
  { key: 'dispatch.urbanSpeedKmh' },
  { key: 'dispatch.staleDriverMinutes' },
  { key: 'coupon.minBalanceThreshold', labelKey: 'settings.minCouponBalance' },
  { key: 'coupon.startingBalance' },
  { key: 'commission.defaultPercent', labelKey: 'settings.defaultCommission' },
];

type Translate = (path: string, fallback?: string, params?: Record<string, string | number>) => string;
type FieldMeta = { labelKey: string; hintKey: string; unit?: string; min?: number; max?: number };

const FIELD_META: Record<string, FieldMeta> = {
  'fare.baseFare': { labelKey: 'settings.fieldBaseFare', hintKey: 'settings.hintBaseFare', unit: 'currency', min: 0, max: 50000 },
  'fare.perKm': { labelKey: 'settings.fieldPerKm', hintKey: 'settings.hintPerKm', unit: 'currency', min: 0, max: 5000 },
  'fare.timeBlockCharge': { labelKey: 'settings.fieldTimeBlockCharge', hintKey: 'settings.hintTimeBlockCharge', unit: 'currency', min: 0, max: 5000 },
  'fare.timeBlockMinutes': { labelKey: 'settings.fieldTimeBlockMinutes', hintKey: 'settings.hintTimeBlockMinutes', unit: 'min', min: 1, max: 60 },
  'fare.minimumFare': { labelKey: 'settings.fieldMinimumFare', hintKey: 'settings.hintMinimumFare', unit: 'currency', min: 0, max: 50000 },
  'fare.currency': { labelKey: 'settings.fieldCurrency', hintKey: 'settings.hintCurrency' },
  'commission.defaultPercent': {
    labelKey: 'settings.fieldCommission',
    hintKey: 'settings.hintCommission',
    unit: '%',
    min: 0,
    max: 100,
  },
  'dispatch.radiusKm': {
    labelKey: 'settings.fieldDispatchRadius',
    hintKey: 'settings.hintDispatchRadius',
    unit: 'km',
    min: 0.5,
    max: 50,
  },
  'dispatch.maxDrivers': { labelKey: 'settings.fieldMaxDrivers', hintKey: 'settings.hintMaxDrivers', min: 1, max: 100 },
  'dispatch.offerTtlSeconds': { labelKey: 'settings.fieldOfferLifetime', hintKey: 'settings.hintOfferLifetime', unit: 'sec', min: 15, max: 900 },
  'dispatch.urbanSpeedKmh': { labelKey: 'settings.fieldUrbanSpeed', hintKey: 'settings.hintUrbanSpeed', unit: 'km/h', min: 5, max: 80 },
  'dispatch.staleDriverMinutes': { labelKey: 'settings.fieldStaleDriver', hintKey: 'settings.hintStaleDriver', unit: 'min', min: 1, max: 60 },
  'coupon.minBalanceThreshold': { labelKey: 'settings.fieldMinCoupon', hintKey: 'settings.hintMinCoupon', min: 0, max: 1000 },
  'coupon.startingBalance': { labelKey: 'settings.fieldStartingCoupons', hintKey: 'settings.hintStartingCoupons', min: 0, max: 1000 },
  'coupon.perRideDeduction': { labelKey: 'settings.fieldPerRide', hintKey: 'settings.hintPerRide', min: 0, max: 100 },
  'coupon.operatorLowBalanceThreshold': { labelKey: 'settings.fieldOperatorLow', hintKey: 'settings.hintOperatorLow', min: 0, max: 10000 },
};

/**
 * Coupon economy controls.
 *
 * The deduction mode is the consequential one: it decides whether a completed
 * ride costs the driver a fixed number of coupons, a percentage of the fare, or
 * both - so it gets an explanation rather than a bare dropdown.
 */
const DEDUCTION_MODES = [
  { value: 'flat', titleKey: 'settings.modeFlat' },
  { value: 'commission', titleKey: 'settings.modeCommission' },
  { value: 'both', titleKey: 'settings.modeBoth' },
];

const COUPON_NUMERIC: { key: string }[] = [
  { key: 'coupon.perRideDeduction' },
  { key: 'coupon.operatorLowBalanceThreshold' },
];

const COUPON_TOGGLES: { key: string; labelKey: string; hintKey: string }[] = [
  {
    key: 'coupon.blockAcceptBelowMinimum',
    labelKey: 'settings.blockAccept',
    hintKey: 'settings.hintBlockAccept',
  },
  {
    key: 'coupon.driverRequestEnabled',
    labelKey: 'settings.driverRequest',
    hintKey: 'settings.hintDriverRequest',
  },
];

const COUPON_KEYS = [
  'coupon.deductionMode',
  ...COUPON_NUMERIC.map((f) => f.key),
  ...COUPON_TOGGLES.map((f) => f.key),
];

export default function Settings() {
  const { user, role, can } = useAuth();
  const { t, language, setLanguage, calendar, setCalendar } = useAppContext();
  const canWrite = can('settings', 'write');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [distribution, setDistribution] = useState<Array<{ percent: number; drivers: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [stale, setStale] = useState(false);

  const load = () => {
    Promise.all([
      api.settings.getSystem(),
      api.settings.commissionDistribution().catch(() => ({ distribution: [] })),
    ])
      .then(([rows, dist]) => {
        const map: Record<string, string> = {};
        const defs: Record<string, string> = {};
        (rows ?? []).forEach((r: any) => {
          map[r.key] = String(r.value);
          defs[r.key] = String(r.defaultValue ?? r.value);
        });
        setValues(map);
        setSaved(map);
        setDefaults(defs);
        setDistribution(dist.distribution ?? []);
      })
      .catch((e) => toast.error(e?.message ?? t('settings.loadFailed', 'Failed to load system settings')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    const onChange = (payload: { performedBy?: string }) => {
      if (payload?.performedBy && payload.performedBy === user?.id) return;
      setStale(true);
    };
    socket.on('settings:changed', onChange);
    return () => {
      socket.off('settings:changed', onChange);
    };
  }, [user?.id]);

  const dirtyKeys = [...EDITABLE.map((f) => f.key), ...COUPON_KEYS];
  const dirty = dirtyKeys.some((key) => (values[key] ?? '') !== (saved[key] ?? ''));

  const handleSave = async () => {
    const error = validateSettings(values, t);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      dirtyKeys.forEach((key) => {
        if (values[key] !== undefined) payload[key] = values[key];
      });
      await withStepUp('fare_change', () => api.settings.updateSystem(payload));
      setSaved(values);
      toast.success(t('settings.savedDispatch', 'System settings saved. Dispatch and fares pick them up within 30 seconds'));
      load();
    } catch (e: any) {
      toast.error(e?.status === 403 ? t('settings.needWrite', 'You need settings:write to change these') : e?.message ?? t('settings.saveFailed', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const resetField = (key: string) => {
    if (defaults[key] === undefined) return;
    setValues({ ...values, [key]: defaults[key] });
  };

  const applyCommission = async () => {
    setApplying(true);
    try {
      const result = await withStepUp('fare_change', () => api.settings.applyCommissionToFleet());
      toast.success(t('settings.appliedCommission', 'Applied {percent}% to {updated} driver(s)', { percent: result.percent, updated: result.updated }));
      setApplyOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? t('settings.applyCommissionFailed', 'Could not apply commission'));
    } finally {
      setApplying(false);
    }
  };

  const saveButton = canWrite ? (
    <Button onClick={handleSave} disabled={saving || !dirty}>
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {dirty ? t('common.saveChanges', 'Save changes') : t('settings.saved', 'Saved')}
    </Button>
  ) : null;

  const currency = (values['fare.currency'] || 'ETB').toUpperCase();
  const numberField = (key: string) => (
    <NumberField
      key={key}
      keyName={key}
      value={values[key] ?? ''}
      disabled={!canWrite}
      currency={currency}
      onChange={(next) => setValues({ ...values, [key]: next })}
      onReset={() => resetField(key)}
    />
  );

  return (
    <Page>
      <PageHeader
        eyebrow={t('settings.workspace', 'Workspace')}
        title={t('settings.title', 'Settings')}
        actions={saveButton}
      />
      {stale ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E9C89A] bg-[#FBEEDF] px-4 py-3 text-sm text-[#B4560B]">
          <span>{t('settings.staleSettings', 'Settings were updated elsewhere. Reload to see the latest.')}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStale(false);
              load();
            }}
          >
            {t('settings.reload', 'Reload')}
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="max-w-4xl gap-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-4 w-4" /> {t('settings.tabProfile', 'Profile')}</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> {t('settings.tabSecurity', 'Security')}</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><CircleDollarSign className="h-4 w-4" /> {t('settings.tabPricing', 'Pricing')}</TabsTrigger>
          <TabsTrigger value="dispatch" className="gap-1.5">{t('settings.tabDispatch', 'Dispatch')}</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5"><Wallet className="h-4 w-4" /> {t('settings.tabCoupons', 'Coupons')}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> {t('settings.tabNotifications', 'Notifications')}</TabsTrigger>
          <TabsTrigger value="localization" className="gap-1.5"><Languages className="h-4 w-4" /> {t('settings.tabLanguage', 'Language')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.profile', 'Profile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('settings.name', 'Name')}</Label><Input defaultValue={user?.name ?? ''} readOnly /></div>
                <div className="space-y-2"><Label>{t('settings.role', 'Role')}</Label><Input value={role === 'admin' ? t('settings.administrator', 'Administrator') : t('settings.callCenter', 'Call Center')} readOnly /></div>
              </div>
              <div className="space-y-2"><Label>{t('settings.email', 'Email')}</Label><Input defaultValue={user?.email ?? ''} readOnly /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityCard />
          <SessionsCard />
          <SecurityPolicyCard />
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.pricingCommission', 'Pricing & commission')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {['fare.baseFare', 'fare.perKm', 'fare.timeBlockCharge', 'fare.timeBlockMinutes', 'fare.minimumFare'].map(numberField)}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>{t('settings.fieldCurrency', 'Currency')}</Label>
                        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => resetField('fare.currency')} disabled={!canWrite}>
                          {t('settings.reset', 'Reset')}
                        </button>
                      </div>
                      <Input
                        value={values['fare.currency'] ?? 'ETB'}
                        disabled={!canWrite}
                        maxLength={3}
                        className="uppercase"
                        onChange={(e) => setValues({ ...values, 'fare.currency': e.target.value.toUpperCase() })}
                      />
                      <p className="text-xs text-muted-foreground">{t(FIELD_META['fare.currency'].hintKey)}</p>
                    </div>
                    {numberField('commission.defaultPercent')}
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">{t('settings.farePreviewTitle', 'Effect on a 5 km, 12-minute trip')}</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeFare(values, t)}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{t('settings.fleetCommission', 'Fleet commission')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {distribution.length
                            ? distribution.map((d) =>
                                t(
                                  d.drivers === 1 ? 'settings.driversAtPercent' : 'settings.driversAtPercentPlural',
                                  '{count} drivers at {percent}%',
                                  { count: d.drivers, percent: d.percent }
                                )
                              ).join(' · ')
                            : t('settings.noDriversYet', 'No drivers yet.')}
                        </p>
                      </div>
                      {canWrite && (
                        <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
                          {t('settings.applyDefaultToAll', 'Apply default to all drivers')}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.tabDispatch', 'Dispatch')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t('settings.enforceRadius', 'Enforce dispatch radius')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t('settings.enforceRadiusHint', 'Off: city-wide, still capped by max drivers.')}</p>
                    </div>
                    <Switch
                      checked={values['dispatch.enforceRadius'] !== 'false'}
                      disabled={!canWrite}
                      onCheckedChange={(checked) => setValues({ ...values, 'dispatch.enforceRadius': checked ? 'true' : 'false' })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['dispatch.radiusKm', 'dispatch.maxDrivers', 'dispatch.offerTtlSeconds', 'dispatch.urbanSpeedKmh', 'dispatch.staleDriverMinutes'].map(numberField)}
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">{t('settings.dispatchPreviewTitle', 'What happens on the next ride')}</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeDispatch(values, t)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" /> {t('settings.couponEconomy', 'Coupon economy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('settings.deductionMode', 'Deduction mode')}</Label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {DEDUCTION_MODES.map((mode) => {
                        const selected = (values['coupon.deductionMode'] ?? 'flat') === mode.value;
                        return (
                          <button
                            key={mode.value}
                            type="button"
                            disabled={!canWrite}
                            onClick={() => setValues({ ...values, 'coupon.deductionMode': mode.value })}
                            className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                              selected
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground">{t(mode.titleKey)}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['coupon.perRideDeduction', 'coupon.operatorLowBalanceThreshold', 'coupon.minBalanceThreshold', 'coupon.startingBalance'].map(numberField)}
                  </div>
                  <div className="space-y-3">
                    {COUPON_TOGGLES.map((field) => {
                      const on = values[field.key] === 'true';
                      return (
                        <div key={field.key} className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{t(field.labelKey)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t(field.hintKey)}</p>
                          </div>
                          <Switch
                            checked={on}
                            disabled={!canWrite}
                            onCheckedChange={(checked) => setValues({ ...values, [field.key]: checked ? 'true' : 'false' })}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">{t('settings.deductionPreviewTitle', 'Effect on a completed ride')}</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeDeduction(values, t)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPrefsCard />
        </TabsContent>

        <TabsContent value="localization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" /> {t('common.language')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="h-10 w-[200px]">
                  <SelectValue placeholder={t('common.language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ</SelectItem>
                  <SelectItem value="om">Oromiffa</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('common.calendar', 'Calendar')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.calendarHint', 'Dates across the dashboard. Ethiopian calendar is expected by Amharic-speaking staff.')}
                </p>
                <Select value={calendar} onValueChange={(value) => setCalendar(value as CalendarMode)}>
                  <SelectTrigger className="h-10 w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gregorian">{t('common.gregorian', 'Gregorian')}</SelectItem>
                    <SelectItem value="ethiopian">{t('common.ethiopian', 'Ethiopian')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.applyCommissionTitle', 'Apply default commission to every driver?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.applyCommissionBody', "This overwrites each driver's current rate with {percent}%. Existing custom rates cannot be restored automatically.", { percent: values['commission.defaultPercent'] ?? '10' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={applying}
              onClick={(e) => {
                e.preventDefault();
                void applyCommission();
              }}
            >
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('settings.applyToFleet', 'Apply to fleet')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function validateSettings(values: Record<string, string>, t: Translate): string | null {
  for (const [key, meta] of Object.entries(FIELD_META)) {
    if (meta.min == null || values[key] === undefined || values[key] === '') continue;
    const n = Number(values[key]);
    if (!Number.isFinite(n) || n < meta.min || n > (meta.max ?? Infinity)) {
      return t('settings.rangeError', '{label} must be between {min} and {max}', {
        label: t(meta.labelKey),
        min: meta.min,
        max: meta.max ?? '',
      });
    }
  }
  const cur = (values['fare.currency'] ?? '').trim().toUpperCase();
  if (cur && !/^[A-Z]{3}$/.test(cur)) return t('settings.currencyIsoError', 'Currency must be a 3-letter ISO code (e.g. ETB)');
  return null;
}

function describeFare(values: Record<string, string>, t: Translate): string {
  const base = Number(values['fare.baseFare'] ?? 90);
  const perKm = Number(values['fare.perKm'] ?? 40);
  const timeCharge = Number(values['fare.timeBlockCharge'] ?? 20);
  const blockMin = Math.max(1, Number(values['fare.timeBlockMinutes'] ?? 4));
  const minimum = Number(values['fare.minimumFare'] ?? 90);
  const currency = (values['fare.currency'] ?? 'ETB').trim().toUpperCase() || 'ETB';
  const blocks = Math.ceil(12 / blockMin);
  const raw = base + perKm * 5 + timeCharge * blocks;
  const fare = Math.max(minimum, raw);
  const raised = raw < minimum
    ? t('settings.fareRaised', ', raised to the {minimum} {currency} minimum', { minimum, currency })
    : '';
  return t(
    'settings.farePreview',
    'A 5 km, 12-minute trip costs {fare} {currency} ({base} base + {perKm} × 5 km + {timeCharge} × {blocks} time {blockWord}{raised}).',
    {
      fare: fare.toFixed(0),
      currency,
      base,
      perKm,
      timeCharge,
      blocks,
      blockWord: t(blocks === 1 ? 'settings.blockSingular' : 'settings.blockPlural', blocks === 1 ? 'block' : 'blocks'),
      raised,
    }
  );
}

function describeDispatch(values: Record<string, string>, t: Translate): string {
  const enforce = values['dispatch.enforceRadius'] !== 'false';
  const radius = Number(values['dispatch.radiusKm'] ?? 5);
  const max = Number(values['dispatch.maxDrivers'] ?? 15);
  const ttl = Number(values['dispatch.offerTtlSeconds'] ?? 180);
  const speed = Number(values['dispatch.urbanSpeedKmh'] ?? 20);
  const stale = Number(values['dispatch.staleDriverMinutes'] ?? 5);
  const ring = enforce
    ? t(
        'settings.dispatchRingEnforce',
        'the closest {max} eligible drivers within {radius} km (expanding to {expanded} km, then city-wide, if the ring is empty)',
        { max, radius, expanded: radius * 2 }
      )
    : t('settings.dispatchRingCity', 'the closest {max} eligible drivers city-wide', { max });
  return t(
    'settings.dispatchPreview',
    'The next ride is offered to {ring}. Drivers have {ttl} seconds to accept. ETAs assume {speed} km/h when routing is unavailable. Online drivers silent for {stale} minutes are dropped.',
    { ring, ttl, speed, stale }
  );
}

function NumberField({
  keyName,
  value,
  disabled,
  currency,
  onChange,
  onReset,
}: {
  keyName: string;
  value: string;
  disabled: boolean;
  currency: string;
  onChange: (next: string) => void;
  onReset: () => void;
}) {
  const { t } = useAppContext();
  const meta = FIELD_META[keyName];
  if (!meta) return null;
  const unit = meta.unit === 'currency' ? currency : meta.unit;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t(meta.labelKey)}</Label>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={onReset}
          disabled={disabled}
        >
          <RotateCcw className="h-3 w-3" /> {t('settings.reset', 'Reset')}
        </button>
      </div>
      <div className="relative">
        <Input
          type="number"
          min={meta.min}
          max={meta.max}
          step={meta.min != null && meta.min < 1 ? 0.1 : 1}
          className="tabular-nums pr-12"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t(meta.hintKey)}</p>
    </div>
  );
}

/** Turn the coupon settings into the sentence an administrator can check. */
function describeDeduction(values: Record<string, string>, t: Translate): string {
  const mode = values['coupon.deductionMode'] ?? 'flat';
  const perRide = Number(values['coupon.perRideDeduction'] ?? 1);
  const commission = Number(values['commission.defaultPercent'] ?? 10);
  const minBalance = Number(values['coupon.minBalanceThreshold'] ?? 10);
  const blocks = values['coupon.blockAcceptBelowMinimum'] !== 'false';

  const gate = blocks
    ? t('settings.gateBlocked', ' Drivers below {threshold} coupons cannot accept a new ride.', {
        threshold: minBalance + (mode === 'commission' ? 0 : perRide),
      })
    : t('settings.gateOpen', ' Drivers are not blocked from accepting when underfunded.');

  if (mode === 'commission') {
    return t('settings.deductCommission', '{percent}% of the fare is deducted as commission from the driver\'s wallet.{gate}', {
      percent: commission,
      gate,
    });
  }
  if (mode === 'both') {
    return t('settings.deductBoth', '{count} coupon(s) plus {percent}% of the fare are deducted from the driver\'s wallet.{gate}', {
      count: perRide,
      percent: commission,
      gate,
    });
  }
  return t('settings.deductFlat', '{count} coupon(s) are deducted from the driver\'s wallet.{gate}', {
    count: perRide,
    gate,
  });
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
      toast.error(t('settings.fillPasswords', 'Fill in your current and new password'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch', 'New password and confirmation do not match'));
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success(t('settings.passwordUpdated', 'Password updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.changePasswordFailed', 'Failed to change password'));
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
      toast.error(t('settings.enterPasswordContinue', 'Enter your password to continue'));
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
      toast.error(e instanceof ApiError ? e.message : t('settings.twoFactorStartFailed', 'Failed to start two-factor setup'));
    } finally {
      setBusy(false);
    }
  };

  const submitConfirmCode = async () => {
    if (!confirmCode) {
      toast.error(t('settings.enterSixDigit', 'Enter the 6-digit code from your authenticator app'));
      return;
    }
    setBusy(true);
    try {
      await api.twoFactor.verify(confirmCode);
      toast.success(t('settings.twoFactorEnabled', 'Two-factor authentication enabled'));
      setTwoFactorEnabled(true);
      setTwoFAStep('idle');
      setTwoFAPassword('');
      setConfirmCode('');
      setQrCodeDataUrl(null);
      setTotpURI(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.invalidCode', 'Invalid code. Try again'));
    } finally {
      setBusy(false);
    }
  };

  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const submitDisable = async () => {
    if (!disablePassword) {
      toast.error(t('settings.enterPasswordContinue', 'Enter your password to continue'));
      return;
    }
    setBusy(true);
    try {
      await api.twoFactor.disable(disablePassword);
      toast.success(t('settings.twoFactorDisabled', 'Two-factor authentication disabled'));
      setTwoFactorEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.twoFactorDisableFailed', 'Failed to disable two-factor authentication'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.security')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Change password */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm text-card-foreground">{t('settings.changePassword')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">{t('settings.currentPassword', 'Current Password')}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t('settings.newPassword', 'New Password')}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t('settings.confirmNewPassword', 'Confirm New Password')}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.passwordPolicyHint', "New passwords cannot match any of your last 5. Shared terminals also idle-timeout after the Super Admin's policy.")}
          </p>
          <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t('settings.updatePassword', 'Update Password')}
          </Button>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? <ShieldCheck className="w-4 h-4 text-[#10B981]" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
              <h4 className="font-semibold text-sm text-card-foreground">{t('settings.twoFactor', 'Two-Factor Authentication')}</h4>
            </div>
            <StatusBadge status={twoFactorEnabled ? 'enabled' : 'disabled'} label={twoFactorEnabled ? t('settings.enabled', 'Enabled') : t('settings.disabled', 'Disabled')} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.twoFactorHint', 'Protects your account with a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) in addition to your password.')}
          </p>

          {!twoFactorEnabled && twoFAStep === 'idle' && (
            <Button size="sm" variant="outline" onClick={startEnable}>{t('settings.enableTwoFactor', 'Enable Two-Factor')}</Button>
          )}

          {twoFAStep === 'password' && (
            <div className="flex flex-col md:flex-row gap-2 max-w-md">
              <Input
                type="password"
                placeholder={t('settings.confirmYourPassword', 'Confirm your password')}
                value={twoFAPassword}
                onChange={(e) => setTwoFAPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitEnablePassword} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.continue', 'Continue')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setTwoFAStep('idle'); setTwoFAPassword(''); }}>{t('common.cancel', 'Cancel')}</Button>
              </div>
            </div>
          )}

          {twoFAStep === 'confirm' && (
            <div className="space-y-4 max-w-md">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {qrCodeDataUrl && (
                  <img src={qrCodeDataUrl} alt={t('settings.qrAlt', 'Two-factor QR code')} className="w-40 h-40 rounded-lg border border-border" />
                )}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>{t('settings.scanQr', '1. Scan this QR code with your authenticator app.')}</p>
                  {totpURI && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={() => {
                        navigator.clipboard.writeText(totpURI);
                        toast.info(t('settings.setupLinkCopied', 'Setup link copied'));
                      }}
                    >
                      <Copy className="w-3 h-3" /> {t('settings.copySetupLink', "Can't scan? Copy setup link")}
                    </button>
                  )}
                  <p>{t('settings.enterCodeConfirm', '2. Enter the 6-digit code it shows below to confirm.')}</p>
                </div>
              </div>

              {backupCodes.length > 0 && (
                <div className="bg-muted rounded-lg p-3 text-xs">
                  <p className="font-semibold mb-1 text-card-foreground">{t('settings.backupCodesHint', 'Backup codes. Save these somewhere safe:')}</p>
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
                <Button onClick={submitConfirmCode} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm', 'Confirm')}
                </Button>
              </div>
            </div>
          )}

          {twoFactorEnabled && !showDisable && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowDisable(true)}>
              {t('settings.disableTwoFactor', 'Disable Two-Factor')}
            </Button>
          )}

          {twoFactorEnabled && showDisable && (
            <div className="flex flex-col md:flex-row gap-2 max-w-md">
              <Input
                type="password"
                placeholder={t('settings.confirmYourPassword', 'Confirm your password')}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={submitDisable} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.confirmDisable', 'Confirm Disable')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDisable(false); setDisablePassword(''); }}>{t('common.cancel', 'Cancel')}</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string, t: Translate) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return t('settings.justNow', 'just now');
  if (minutes < 60) return t('settings.minutesAgo', '{n}m ago', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('settings.hoursAgo', '{n}h ago', { n: hours });
  return t('settings.daysAgo', '{n}d ago', { n: Math.round(hours / 24) });
}

function SessionsCard() {
  const { t } = useAppContext();
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.auth
      .sessions()
      .then((data) => setSessions(data.sessions ?? []))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : t('settings.sessionsLoadFailed', 'Could not load sessions')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await api.auth.revokeSession(id);
      toast.success(t('settings.sessionRevoked', 'Session revoked'));
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.revokeFailed', 'Could not revoke session'));
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    try {
      await api.auth.revokeOtherSessions();
      toast.success(t('settings.othersSignedOut', 'Other sessions signed out'));
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.signOutOthersFailed', 'Could not sign out other sessions'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-primary" /> {t('settings.activeSessions', 'Active sessions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.noSessions', 'No active sessions.')}</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{session.deviceName}</p>
                  {session.isCurrent && <span className="text-xs font-medium text-primary">{t('settings.thisDevice', 'This device')}</span>}
                  {session.isTrusted && <StatusBadge status="trusted" label={t('settings.trusted', 'Trusted')} />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.ipAddress ?? t('settings.unknownIp', 'Unknown IP')} · {t('settings.lastActiveAgo', 'last active {time}', { time: timeAgo(session.lastActivityAt, t) })}
                </p>
              </div>
              {!session.isCurrent && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => revoke(session.id)} disabled={busyId === session.id}>
                  {busyId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.revoke', 'Revoke')}
                </Button>
              )}
            </div>
          ))
        )}
        {sessions.some((s) => !s.isCurrent) && (
          <Button variant="outline" size="sm" onClick={revokeOthers} disabled={busyId === 'others'}>
            {t('settings.signOutOthers', 'Sign out other sessions')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityPolicyCard() {
  const { isSuperAdmin } = useAuth();
  const { t } = useAppContext();
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .securityPolicy()
      .then(setPolicy)
      .catch(() => undefined);
  }, []);

  if (!isSuperAdmin || !policy) return null;

  const save = async (next: SecurityPolicy) => {
    setSaving(true);
    try {
      const updated = await api.settings.updateSecurityPolicy(next);
      setPolicy(updated);
      toast.success(t('settings.policySaved', 'Security policy saved'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('settings.policySaveFailed', 'Could not save policy'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> {t('settings.securityPolicy', 'Security policy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {[
          { key: 'super-admin' as const, labelKey: 'settings.roleSuperAdmin' },
          { key: 'admin' as const, labelKey: 'settings.roleAdministrators' },
          { key: 'agent' as const, labelKey: 'settings.roleCallCentre' },
        ].map((role) => (
          <div key={role.key} className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t('settings.require2faFor', 'Require 2FA for {role}', { role: t(role.labelKey) })}</p>
              <p className="text-xs text-muted-foreground">{t('settings.require2faHint', 'They enrol at the next sign-in before the dashboard opens.')}</p>
            </div>
            <Switch
              checked={policy.require2FA[role.key]}
              disabled={saving}
              onCheckedChange={(checked) =>
                save({ ...policy, require2FA: { ...policy.require2FA, [role.key]: checked } })
              }
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label>{t('settings.idleTimeout', 'Idle timeout (minutes)')}</Label>
          <Input
            type="number"
            min={1}
            max={1440}
            value={policy.idleTimeoutMinutes}
            disabled={saving}
            className="max-w-[160px]"
            onChange={(e) => setPolicy({ ...policy, idleTimeoutMinutes: Number(e.target.value) })}
            onBlur={() => save(policy)}
          />
          <p className="text-xs text-muted-foreground">{t('settings.idleTimeoutHint', '7-day sessions stay, but a quiet terminal signs itself out.')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
