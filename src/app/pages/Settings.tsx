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

type FieldMeta = { label: string; hint: string; unit?: string; min?: number; max?: number };

const FIELD_META: Record<string, FieldMeta> = {
  'fare.baseFare': { label: 'Base fare', hint: 'Charged before distance and time.', unit: 'currency', min: 0, max: 50000 },
  'fare.perKm': { label: 'Per kilometre', hint: 'Added for every kilometre of the trip.', unit: 'currency', min: 0, max: 5000 },
  'fare.timeBlockCharge': { label: 'Time-block charge', hint: 'Added for each time block.', unit: 'currency', min: 0, max: 5000 },
  'fare.timeBlockMinutes': { label: 'Time-block length', hint: 'Minutes in one time block.', unit: 'min', min: 1, max: 60 },
  'fare.minimumFare': { label: 'Minimum fare', hint: 'Floor applied after the calculation.', unit: 'currency', min: 0, max: 50000 },
  'fare.currency': { label: 'Currency', hint: 'ISO code shown on every receipt and payout.' },
  'commission.defaultPercent': {
    label: 'Default commission for new drivers',
    hint: 'Applied to new drivers. Existing rates stay until you apply to fleet.',
    unit: '%',
    min: 0,
    max: 100,
  },
  'dispatch.radiusKm': {
    label: 'Dispatch radius',
    hint: 'Offer radius. Expands if empty.',
    unit: 'km',
    min: 0.5,
    max: 50,
  },
  'dispatch.maxDrivers': { label: 'Max drivers notified', hint: 'Closest N eligible drivers.', min: 1, max: 100 },
  'dispatch.offerTtlSeconds': { label: 'Offer lifetime', hint: 'Seconds to accept.', unit: 'sec', min: 15, max: 900 },
  'dispatch.urbanSpeedKmh': { label: 'Urban speed for ETA', hint: 'Fallback when routing is unavailable.', unit: 'km/h', min: 5, max: 80 },
  'dispatch.staleDriverMinutes': { label: 'Stale-driver threshold', hint: 'Drop online drivers with no GPS after this.', unit: 'min', min: 1, max: 60 },
  'coupon.minBalanceThreshold': { label: 'Minimum coupon balance', hint: 'Drivers at or below this cannot take new rides.', min: 0, max: 1000 },
  'coupon.startingBalance': { label: 'New-driver starting coupons', hint: 'Granted when a driver is created.', min: 0, max: 1000 },
  'coupon.perRideDeduction': { label: 'Coupons per completed ride', hint: 'Deducted automatically when a driver ends a trip.', min: 0, max: 100 },
  'coupon.operatorLowBalanceThreshold': { label: 'Operator low-stock warning', hint: 'Inventory level at which an operator is prompted to restock.', min: 0, max: 10000 },
};

/**
 * Coupon economy controls.
 *
 * The deduction mode is the consequential one: it decides whether a completed
 * ride costs the driver a fixed number of coupons, a percentage of the fare, or
 * both - so it gets an explanation rather than a bare dropdown.
 */
const DEDUCTION_MODES = [
  { value: 'flat', title: 'Fixed coupons' },
  { value: 'commission', title: 'Commission only' },
  { value: 'both', title: 'Both' },
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
    hint: 'Stop underfunded drivers from accepting.',
  },
  {
    key: 'coupon.driverRequestEnabled',
    label: 'Let drivers request refills',
    hint: 'Drivers can request coupons from the app.',
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
      .catch((e) => toast.error(e?.message ?? 'Failed to load system settings'))
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
    const error = validateSettings(values);
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
      toast.success('System settings saved - dispatch and fares pick them up within 30 seconds');
      load();
    } catch (e: any) {
      toast.error(e?.status === 403 ? 'You need settings:write to change these' : e?.message ?? 'Failed to save');
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
      toast.success(`Applied ${result.percent}% to ${result.updated} driver(s)`);
      setApplyOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not apply commission');
    } finally {
      setApplying(false);
    }
  };

  const saveButton = canWrite ? (
    <Button onClick={handleSave} disabled={saving || !dirty}>
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {dirty ? 'Save changes' : 'Saved'}
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
        eyebrow="Workspace"
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
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><CircleDollarSign className="h-4 w-4" /> Pricing</TabsTrigger>
          <TabsTrigger value="dispatch" className="gap-1.5">Dispatch</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5"><Wallet className="h-4 w-4" /> Coupons</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="localization" className="gap-1.5"><Languages className="h-4 w-4" /> Language</TabsTrigger>
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
              <CardTitle>Pricing & commission</CardTitle>
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
                        <Label>Currency</Label>
                        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => resetField('fare.currency')} disabled={!canWrite}>
                          Reset
                        </button>
                      </div>
                      <Input
                        value={values['fare.currency'] ?? 'ETB'}
                        disabled={!canWrite}
                        maxLength={3}
                        className="uppercase"
                        onChange={(e) => setValues({ ...values, 'fare.currency': e.target.value.toUpperCase() })}
                      />
                      <p className="text-xs text-muted-foreground">{FIELD_META['fare.currency'].hint}</p>
                    </div>
                    {numberField('commission.defaultPercent')}
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">Effect on a 5 km, 12-minute trip</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeFare(values)}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Fleet commission</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {distribution.length
                            ? distribution.map((d) => `${d.drivers} driver${d.drivers === 1 ? '' : 's'} at ${d.percent}%`).join(' · ')
                            : 'No drivers yet.'}
                        </p>
                      </div>
                      {canWrite && (
                        <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
                          Apply default to all drivers
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
              <CardTitle>Dispatch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Enforce dispatch radius</p>
                      <p className="mt-1 text-xs text-muted-foreground">Off: city-wide, still capped by max drivers.</p>
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
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">What happens on the next ride</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeDispatch(values)}</p>
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
                <Ticket className="h-4 w-4 text-primary" /> Coupon economy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
                            disabled={!canWrite}
                            onClick={() => setValues({ ...values, 'coupon.deductionMode': mode.value })}
                            className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                              selected
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground">{mode.title}</p>
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
                            <p className="text-sm font-medium text-foreground">{field.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>
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
                    <p className="text-xs uppercase tracking-[0.09em] text-muted-foreground">Effect on a completed ride</p>
                    <p className="mt-1.5 text-sm text-foreground">{describeDeduction(values)}</p>
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
            <AlertDialogTitle>Apply default commission to every driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This overwrites each driver&apos;s current rate with {values['commission.defaultPercent'] ?? '10'}%.
              Existing custom rates cannot be restored automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applying}
              onClick={(e) => {
                e.preventDefault();
                void applyCommission();
              }}
            >
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply to fleet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function validateSettings(values: Record<string, string>): string | null {
  for (const [key, meta] of Object.entries(FIELD_META)) {
    if (meta.min == null || values[key] === undefined || values[key] === '') continue;
    const n = Number(values[key]);
    if (!Number.isFinite(n) || n < meta.min || n > (meta.max ?? Infinity)) {
      return `${meta.label} must be between ${meta.min} and ${meta.max}`;
    }
  }
  const cur = (values['fare.currency'] ?? '').trim().toUpperCase();
  if (cur && !/^[A-Z]{3}$/.test(cur)) return 'Currency must be a 3-letter ISO code (e.g. ETB)';
  return null;
}

function describeFare(values: Record<string, string>): string {
  const base = Number(values['fare.baseFare'] ?? 90);
  const perKm = Number(values['fare.perKm'] ?? 40);
  const timeCharge = Number(values['fare.timeBlockCharge'] ?? 20);
  const blockMin = Math.max(1, Number(values['fare.timeBlockMinutes'] ?? 4));
  const minimum = Number(values['fare.minimumFare'] ?? 90);
  const currency = (values['fare.currency'] ?? 'ETB').trim().toUpperCase() || 'ETB';
  const blocks = Math.ceil(12 / blockMin);
  const raw = base + perKm * 5 + timeCharge * blocks;
  const fare = Math.max(minimum, raw);
  const raised = raw < minimum ? `, raised to the ${minimum} ${currency} minimum` : '';
  return `A 5 km, 12-minute trip costs ${fare.toFixed(0)} ${currency} (${base} base + ${perKm} × 5 km + ${timeCharge} × ${blocks} time block${blocks === 1 ? '' : 's'}${raised}).`;
}

function describeDispatch(values: Record<string, string>): string {
  const enforce = values['dispatch.enforceRadius'] !== 'false';
  const radius = Number(values['dispatch.radiusKm'] ?? 5);
  const max = Number(values['dispatch.maxDrivers'] ?? 15);
  const ttl = Number(values['dispatch.offerTtlSeconds'] ?? 180);
  const speed = Number(values['dispatch.urbanSpeedKmh'] ?? 20);
  const stale = Number(values['dispatch.staleDriverMinutes'] ?? 5);
  const ring = enforce
    ? `the closest ${max} eligible drivers within ${radius} km (expanding to ${radius * 2} km, then city-wide, if the ring is empty)`
    : `the closest ${max} eligible drivers city-wide`;
  return `The next ride is offered to ${ring}. Drivers have ${ttl} seconds to accept. ETAs assume ${speed} km/h when routing is unavailable. Online drivers silent for ${stale} minutes are dropped.`;
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
  const meta = FIELD_META[keyName];
  if (!meta) return null;
  const unit = meta.unit === 'currency' ? currency : meta.unit;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{meta.label}</Label>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={onReset}
          disabled={disabled}
        >
          <RotateCcw className="h-3 w-3" /> Reset
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
      <p className="text-xs text-muted-foreground">{meta.hint}</p>
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
      toast.error(e instanceof ApiError ? e.message : 'Invalid code - try again');
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
          <p className="text-xs text-muted-foreground">
            New passwords cannot match any of your last 5. Shared terminals also idle-timeout after the Super Admin’s policy.
          </p>
          <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Update Password
          </Button>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {twoFactorEnabled ? <ShieldCheck className="w-4 h-4 text-[#10B981]" /> : <ShieldOff className="w-4 h-4 text-muted-foreground" />}
              <h4 className="font-semibold text-sm text-card-foreground">Two-Factor Authentication</h4>
            </div>
            <StatusBadge status={twoFactorEnabled ? 'enabled' : 'disabled'} label={twoFactorEnabled ? 'Enabled' : 'Disabled'} />
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
                <Button size="sm" onClick={submitEnablePassword} disabled={busy}>
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
                      className="flex items-center gap-1 text-primary hover:underline"
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
                  <p className="font-semibold mb-1 text-card-foreground">Backup codes - save these somewhere safe:</p>
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

function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function SessionsCard() {
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.auth
      .sessions()
      .then((data) => setSessions(data.sessions ?? []))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Could not load sessions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await api.auth.revokeSession(id);
      toast.success('Session revoked');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not revoke session');
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    try {
      await api.auth.revokeOtherSessions();
      toast.success('Other sessions signed out');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not sign out other sessions');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="w-4 h-4 text-primary" /> Active sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{session.deviceName}</p>
                  {session.isCurrent && <span className="text-xs font-medium text-primary">This device</span>}
                  {session.isTrusted && <StatusBadge status="trusted" label="Trusted" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.ipAddress ?? 'Unknown IP'} · last active {timeAgo(session.lastActivityAt)}
                </p>
              </div>
              {!session.isCurrent && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => revoke(session.id)} disabled={busyId === session.id}>
                  {busyId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoke'}
                </Button>
              )}
            </div>
          ))
        )}
        {sessions.some((s) => !s.isCurrent) && (
          <Button variant="outline" size="sm" onClick={revokeOthers} disabled={busyId === 'others'}>
            Sign out other sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityPolicyCard() {
  const { isSuperAdmin } = useAuth();
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
      toast.success('Security policy saved');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Security policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {[
          { key: 'super-admin' as const, label: 'Super Admin' },
          { key: 'admin' as const, label: 'Administrators' },
          { key: 'agent' as const, label: 'Call-centre operators' },
        ].map((role) => (
          <div key={role.key} className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Require 2FA for {role.label}</p>
              <p className="text-xs text-muted-foreground">They enrol at the next sign-in before the dashboard opens.</p>
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
          <Label>Idle timeout (minutes)</Label>
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
          <p className="text-xs text-muted-foreground">7-day sessions stay, but a quiet terminal signs itself out.</p>
        </div>
      </CardContent>
    </Card>
  );
}
