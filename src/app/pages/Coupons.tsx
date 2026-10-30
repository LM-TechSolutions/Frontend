import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Car,
  Check,
  Clock,
  Inbox,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { api, type CouponPackage, type CouponRequest, type OperatorWallet } from '../lib/api';
import { withStepUp } from '../components/security/StepUpDialog';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { connectSocket, getSocket } from '../lib/socket';
import { formatETB } from '../lib/format';
import {
  BalancePill,
  EmptyState,
  Initials,
  RequestStatusChip,
  RowSkeleton,
  StatTile,
  TONE_STYLES,
  couponTone,
  timeAgo,
} from '../components/coupons/CouponAtoms';
import { PageHeader } from '../components/layout/PageHeader';


/**
 * The coupon economy console.
 *
 * Coupons flow Super Admin → Operator → Driver, and this one screen is where
 * every tier of that flow is worked. What it shows is driven by what the
 * signed-in account may actually do: an operator sees the inventory they sell
 * from, an admin additionally sees the operators they supply and the packages
 * they supply them with.
 */
export default function Coupons() {
  const { t } = useAppContext();
  const { can, isSuperAdmin, role } = useAuth();

  const canAllocate = can('coupons', 'allocate');
  const canManagePackages = can('coupons', 'manage_packages');
  const isAdminView = canAllocate || isSuperAdmin || role === 'admin';

  const [drivers, setDrivers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<OperatorWallet[]>([]);
  const [myWallet, setMyWallet] = useState<OperatorWallet | null>(null);
  const [requests, setRequests] = useState<CouponRequest[]>([]);
  const [packages, setPackages] = useState<CouponPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('drivers');

  const [sellTarget, setSellTarget] = useState<any | null>(null);
  const [allocateTarget, setAllocateTarget] = useState<OperatorWallet | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [minCouponBalance, setMinCouponBalance] = useState(10);

  const load = useCallback(async () => {
    const tasks: Promise<unknown>[] = [
      api.drivers
        .list({ limit: 200 })
        .then((res) => setDrivers(res.drivers ?? []))
        .catch(() => undefined),
      api.couponRequests
        .list({ limit: 100 })
        .then((res) => setRequests(res.requests ?? []))
        .catch(() => undefined),
      api.couponPackages
        .list()
        .then((res) => setPackages(res.packages ?? []))
        .catch(() => undefined),
      isAdminView
        ? api.operatorCoupons
            .listWallets()
            .then((res) => setWallets(res.wallets ?? []))
            .catch(() => undefined)
        : api.operatorCoupons
            .wallet('me')
            .then(setMyWallet)
            .catch(() => undefined),
      api.settings
        .opsConfig()
        .then((ops) => setMinCouponBalance(ops.minCouponBalance ?? 10))
        .catch(() => undefined),
    ];

    await Promise.all(tasks);
    setLoading(false);
  }, [isAdminView]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep balances and the request queue live - a refill approved at another
  // desk should land here without a reload.
  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 400);
    };

    const events = [
      'coupon:request',
      'coupon:request:resolved',
      'coupon:low',
      'coupon:empty',
    ];
    events.forEach((e) => socket.on(e, refresh));
    const onReconnect = () => void load();
    socket.io.on('reconnect', onReconnect);
    const onBalance = (data: any) => {
      if (data?.driverId && typeof data.balance === 'number') {
        setDrivers((prev) => prev.map((d) => (d.id === data.driverId ? { ...d, couponBalance: data.balance } : d)));
      }
      if (data?.operatorId && typeof data.balance === 'number') {
        setWallets((prev) => prev.map((w) => (w.operatorId === data.operatorId ? { ...w, balance: data.balance } : w)));
        setMyWallet((prev) => (prev && prev.operatorId === data.operatorId ? { ...prev, balance: data.balance } : prev));
      }
    };
    socket.on('coupon:balance', onBalance);
    socket.on('coupon:operator:balance', onBalance);
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => socket.off(e, refresh));
      socket.off('coupon:balance', onBalance);
      socket.off('coupon:operator:balance', onBalance);
      socket.io.off('reconnect', onReconnect);
    };
  }, [load]);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  const visibleDrivers = useMemo(() => {
    if (!search) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(
      (d) =>
        (d.name ?? '').toLowerCase().includes(q) ||
        (d.licensePlate ?? '').toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const totals = useMemo(
    () => ({
      inCirculation: drivers.reduce((sum, d) => sum + (d.couponBalance ?? 0), 0),
      lowDrivers: drivers.filter((d) => (d.couponBalance ?? 0) < minCouponBalance).length,
      operatorStock: wallets.reduce((sum, w) => sum + w.balance, 0),
    }),
    [drivers, wallets, minCouponBalance]
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow={t('coupons.economy')}
        title={t('coupons.title')}
        actions={
          <div className="flex items-center gap-2">
            {!isAdminView && (
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setRequestOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" /> {t('coupons.requestStock')}
              </Button>
            )}
            {canManagePackages && (
              <Button onClick={() => setPackageDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t('coupons.newPackage')}
              </Button>
            )}
          </div>
        }
      />

      {/* An operator's own stock is the number they live by, so it leads. */}
      {!isAdminView && <InventoryHero wallet={myWallet} onRequest={() => setRequestOpen(true)} />}

      {isAdminView && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t('coupons.inDriverWallets')}
            value={totals.inCirculation.toLocaleString()}
            hint={
              drivers.length === 1
                ? t('coupons.acrossDriversOne')
                : t('coupons.acrossDrivers', undefined, { count: drivers.length })
            }
            icon={Wallet}
          />
          <StatTile
            label={t('coupons.operatorInventory')}
            value={totals.operatorStock.toLocaleString()}
            hint={
              wallets.length === 1
                ? t('coupons.operatorsSuppliedOne')
                : t('coupons.operatorsSupplied', undefined, { count: wallets.length })
            }
            icon={Boxes}
            accent="#6366F1"
          />
          <StatTile
            label={t('coupons.driversRunningLow')}
            value={totals.lowDrivers.toLocaleString()}
            hint={t('coupons.belowCoupons', undefined, { count: minCouponBalance })}
            icon={AlertTriangle}
            accent={totals.lowDrivers > 0 ? '#EF4444' : '#10B981'}
            onClick={() => setTab('drivers')}
          />
          <StatTile
            label={t('coupons.pendingRequests')}
            value={pendingRequests.length.toLocaleString()}
            hint={pendingRequests.length ? t('coupons.awaitingDecision') : t('coupons.queueClear')}
            icon={Inbox}
            accent={pendingRequests.length > 0 ? '#F59E0B' : '#10B981'}
            onClick={() => setTab('requests')}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
          <TabsTrigger value="drivers" className="gap-2 data-[state=active]:bg-background">
            <Car className="h-4 w-4" /> {t('nav.drivers')}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 data-[state=active]:bg-background">
            <Inbox className="h-4 w-4" /> {t('coupons.tabRequests')}
            {pendingRequests.length > 0 && (
              <span className="text-[11px] font-semibold text-[color:var(--warning)]">{pendingRequests.length}</span>
            )}
          </TabsTrigger>
          {isAdminView && (
            <TabsTrigger value="operators" className="gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" /> {t('nav.operators')}
            </TabsTrigger>
          )}
          <TabsTrigger value="packages" className="gap-2 data-[state=active]:bg-background">
            <Package className="h-4 w-4" /> {t('coupons.tabPackages')}
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------- drivers */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('coupons.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10"
            />
          </div>

          {loading ? (
            <RowSkeleton rows={5} />
          ) : visibleDrivers.length === 0 ? (
            <EmptyState
              icon={Car}
              title={t('coupons.noDriversMatch')}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {visibleDrivers.map((driver) => (
                <DriverCouponCard key={driver.id} driver={driver} threshold={minCouponBalance} onSell={() => setSellTarget(driver)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------ requests */}
        <TabsContent value="requests" className="space-y-4">
          {loading ? (
            <RowSkeleton rows={3} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t('coupons.noRequests')}
            />
          ) : (
            <RequestQueue requests={requests} onResolved={load} isAdminView={isAdminView} />
          )}
        </TabsContent>

        {/* ----------------------------------------------------- operators */}
        {isAdminView && (
          <TabsContent value="operators" className="space-y-4">
            {loading ? (
              <RowSkeleton rows={3} />
            ) : wallets.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('coupons.noOperators')}
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {wallets.map((wallet) => (
                  <OperatorWalletCard
                    key={wallet.operatorId}
                    wallet={wallet}
                    onAllocate={() => setAllocateTarget(wallet)}
                    canAllocate={canAllocate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ------------------------------------------------------ packages */}
        <TabsContent value="packages" className="space-y-4">
          {loading ? (
            <RowSkeleton rows={3} />
          ) : packages.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('coupons.noPackages')}
              action={
                canManagePackages ? (
                  <Button
                    onClick={() => setPackageDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> {t('coupons.createFirstPackage')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} canEdit={canManagePackages} onChanged={load} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SellDialog
        driver={sellTarget}
        onClose={() => setSellTarget(null)}
        onDone={load}
        inventory={isAdminView ? null : myWallet?.balance ?? 0}
      />
      <AllocateDialog
        wallet={allocateTarget}
        packages={packages}
        onClose={() => setAllocateTarget(null)}
        onDone={load}
      />
      <RequestStockDialog open={requestOpen} onClose={() => setRequestOpen(false)} onDone={load} />
      <PackageDialog open={packageDialogOpen} onClose={() => setPackageDialogOpen(false)} onDone={load} />
    </div>
  );
}

/* -------------------------------------------------------------- hero ---- */

function InventoryHero({ wallet, onRequest }: { wallet: OperatorWallet | null; onRequest: () => void }) {
  const { t } = useAppContext();
  const balance = wallet?.balance ?? 0;
  const threshold = wallet?.lowBalanceThreshold ?? 50;
  const tone = couponTone(balance, threshold);
  const isLow = tone !== 'healthy';

  return (
    <Card className="overflow-hidden border-border/70">
      <div className="relative bg-gradient-to-br from-primary via-[var(--primary-hover)] to-sidebar p-6 text-white">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">{t('coupons.myInventory')}</p>
            <p className="mt-2 text-5xl font-semibold leading-none tabular-nums">{balance.toLocaleString()}</p>
            <p className="mt-2 text-sm text-white/80">
              {isLow ? t('coupons.lowStockHint') : t('coupons.availableToSell')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.09em] text-white/60">{t('coupons.received')}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {(wallet?.totalAllocated ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.09em] text-white/60">{t('coupons.sold')}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{(wallet?.totalSold ?? 0).toLocaleString()}</p>
            </div>
            <Button onClick={onRequest} className="bg-white text-primary shadow-sm hover:bg-white/90">
              <Send className="mr-2 h-4 w-4" /> {t('coupons.requestMore')}
            </Button>
          </div>
        </div>
      </div>

      {isLow && (
        <CardContent className={`flex items-center gap-2 border-t border-border/60 p-3 ${TONE_STYLES[tone].bg}`}>
          <AlertTriangle className={`h-4 w-4 ${TONE_STYLES[tone].text}`} />
          <p className={`text-sm font-medium ${TONE_STYLES[tone].text}`}>
            {t('coupons.toneAgainstThreshold', undefined, {
              label: t(`common.${tone}`),
              balance,
              threshold,
            })}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- cards ---- */

function DriverCouponCard({ driver, threshold, onSell }: { driver: any; threshold: number; onSell: () => void }) {
  const { t } = useAppContext();
  const balance = driver.couponBalance ?? 0;
  const tone = couponTone(balance, threshold);

  return (
    <Card className="group overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Initials name={driver.name} src={driver.profilePicture} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{driver.name}</p>
            <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
              {driver.vehicleType ?? '-'} · {driver.licensePlate}
            </p>
          </div>
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              driver.status === 'available'
                ? 'bg-[#10B981]'
                : driver.status === 'busy'
                ? 'bg-[#EF4444]'
                : 'bg-[#9CA3AF]'
            }`}
            title={driver.status}
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{driver.phone}</span>
        </div>

        <div className="flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{t('coupons.balance')}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE_STYLES[tone].text}`}>
              {balance.toLocaleString()}
            </p>
          </div>
          <Button size="sm" onClick={onSell}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('coupons.refillShort')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OperatorWalletCard({
  wallet,
  onAllocate,
  canAllocate,
}: {
  wallet: OperatorWallet;
  onAllocate: () => void;
  canAllocate: boolean;
}) {
  const { t } = useAppContext();
  const name = wallet.operator ? `${wallet.operator.firstName} ${wallet.operator.lastName}`.trim() : t('coupons.operator');
  const tone = couponTone(wallet.balance, wallet.lowBalanceThreshold);

  return (
    <Card className="border-border/70 transition-all hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Initials name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {wallet.operator?.employeeId} · {wallet.operator?.user?.email ?? '-'}
            </p>
          </div>
          <BalancePill balance={wallet.balance} threshold={wallet.lowBalanceThreshold} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{t('coupons.inStock')}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${TONE_STYLES[tone].text}`}>
              {wallet.balance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{t('coupons.received')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {wallet.totalAllocated.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{t('coupons.soldOn')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {wallet.totalSold.toLocaleString()}
            </p>
          </div>
        </div>

        {canAllocate && (
          <Button
            variant="outline"
            className="w-full border-primary/40 text-primary hover:bg-primary/10"
            onClick={onAllocate}
          >
            <Boxes className="mr-2 h-4 w-4" /> {t('coupons.allocateCoupons')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PackageCard({ pkg, canEdit, onChanged }: { pkg: CouponPackage; canEdit: boolean; onChanged: () => void }) {
  const { t } = useAppContext();
  const [saving, setSaving] = useState(false);

  const toggle = async (isActive: boolean) => {
    setSaving(true);
    try {
      await api.couponPackages.update(pkg.id, { isActive });
      toast.success(isActive ? t('coupons.packageAvailable', undefined, { name: pkg.name }) : t('coupons.packageRetired', undefined, { name: pkg.name }));
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.updatePackageFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`border-border/70 transition-opacity ${pkg.isActive ? '' : 'opacity-60'}`}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{pkg.name}</p>
            {pkg.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pkg.description}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/10">
            <Package className="h-5 w-5 text-[#6366F1]" />
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{pkg.couponCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {pkg.price != null
                ? t('coupons.couponsWithPrice', undefined, { price: formatETB(pkg.price) })
                : t('common.coupons')}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{pkg.isActive ? t('coupons.active') : t('coupons.retired')}</span>
              <Switch checked={pkg.isActive} disabled={saving} onCheckedChange={toggle} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------- requests ---- */

function RequestQueue({
  requests,
  onResolved,
  isAdminView,
}: {
  requests: CouponRequest[];
  onResolved: () => void;
  isAdminView: boolean;
}) {
  const { t } = useAppContext();
  const pending = requests.filter((r) => r.status === 'pending');
  const settled = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('coupons.awaitingDecisionCount', undefined, { count: pending.length })}
          </h3>
          {pending.map((request) => (
            <RequestRow key={request.id} request={request} onResolved={onResolved} isAdminView={isAdminView} />
          ))}
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">{t('coupons.recentlySettled')}</h3>
          {settled.slice(0, 15).map((request) => (
            <RequestRow key={request.id} request={request} onResolved={onResolved} isAdminView={isAdminView} />
          ))}
        </section>
      )}
    </div>
  );
}

function RequestRow({
  request,
  onResolved,
  isAdminView,
}: {
  request: CouponRequest;
  onResolved: () => void;
  isAdminView: boolean;
}) {
  const { t } = useAppContext();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [amount, setAmount] = useState(String(request.amount));

  const fromDriver = request.requesterType === 'driver';
  const who = fromDriver
    ? request.driver
      ? `${request.driver.firstName} ${request.driver.lastName}`.trim()
      : t('common.driver')
    : request.operator
    ? `${request.operator.firstName} ${request.operator.lastName}`.trim()
    : t('coupons.operator');

  const currentBalance = fromDriver
    ? request.driver?.couponWallet?.balance ?? 0
    : request.operator?.couponWallet?.balance ?? 0;

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const granted = Number(amount);
      if (!Number.isFinite(granted) || granted <= 0) {
        toast.error(t('coupons.enterGrantAmount'));
        return;
      }
      setBusy('approve');
      try {
        await api.couponRequests.approve(request.id, { amount: granted });
        toast.success(t('coupons.grantedTo', undefined, { count: granted, name: who }));
        onResolved();
      } catch (e: any) {
        toast.error(e?.message ?? t('coupons.approveFailed'));
      } finally {
        setBusy(null);
      }
      return;
    }

    setBusy('reject');
    try {
      await api.couponRequests.reject(request.id);
      toast.success(t('coupons.rejectedFrom', undefined, { name: who }));
      onResolved();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.rejectFailed'));
    } finally {
      setBusy(null);
    }
  };

  const isPending = request.status === 'pending';
  // An operator settles driver requests; only an admin settles operator requests.
  const canResolve = isPending && (fromDriver || isAdminView);

  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <Initials name={who} src={fromDriver ? request.driver?.user?.image : undefined} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{who}</p>
            <span className="text-xs text-muted-foreground">{fromDriver ? t('common.driver') : t('coupons.operator')}</span>
            {request.autoCreated && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> {t('coupons.auto')}
              </span>
            )}
            {!isPending && <RequestStatusChip status={request.status} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('coupons.askedHolds', undefined, { asked: request.amount, holds: currentBalance })}
            <span className="mx-1.5 opacity-50">·</span>
            <Clock className="mr-1 inline h-3 w-3" />
            {timeAgo(request.createdAt)}
          </p>
          {request.note && <p className="mt-1 truncate text-xs italic text-muted-foreground">“{request.note}”</p>}
        </div>

        {canResolve && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-24 text-center tabular-nums"
              aria-label={t('coupons.grantAria', undefined, { name: who })}
            />
            <Button
              size="sm"
              className="bg-[#10B981] text-white hover:bg-[#059669]"
              disabled={busy !== null}
              onClick={() => act('approve')}
            >
              {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="ml-1.5">{t('coupons.approve')}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#EF4444]/40 text-[#DC2626] hover:bg-[#EF4444]/10 dark:text-[#F87171]"
              disabled={busy !== null}
              onClick={() => act('reject')}
              aria-label={t('coupons.rejectAria', undefined, { name: who })}
            >
              {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------- dialogs ---- */

function SellDialog({
  driver,
  onClose,
  onDone,
  inventory,
}: {
  driver: any | null;
  onClose: () => void;
  onDone: () => void;
  /** The operator's available stock, or null when an admin is issuing directly. */
  inventory: number | null;
}) {
  const { t } = useAppContext();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (driver) setAmount('');
  }, [driver]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const exceedsStock = inventory !== null && valid && parsed > inventory;

  const submit = async () => {
    if (!driver || !valid || exceedsStock) return;
    setSaving(true);
    try {
      await api.coupons.refill(driver.id, parsed, t('coupons.refill'));
      toast.success(t('coupons.addedTo', undefined, { count: parsed, name: driver.name }));
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.refillFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!driver} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {driver ? <Initials name={driver.name} src={driver.profilePicture} className="h-10 w-10 text-xs" /> : null}
            <span>{t('coupons.refillName', undefined, { name: driver?.name ?? '' })}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {inventory !== null
              ? t('coupons.soldFromInventory', undefined, { count: inventory.toLocaleString() })
              : t('coupons.issuedDirect')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('coupons.plate')}</p>
              <p className="font-medium text-foreground">{driver?.licensePlate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('coupons.phone')}</p>
              <p className="font-medium text-foreground">{driver?.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">{t('coupons.currentBalanceLabel')}</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{driver?.couponBalance ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sell-amount">{t('coupons.couponsToAdd')}</Label>
            <Input
              id="sell-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-11 text-lg tabular-nums"
              autoFocus
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {[10, 25, 50, 100].map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                  onClick={() => setAmount(String(q))}
                >
                  +{q}
                </Button>
              ))}
            </div>
          </div>

          {valid && !exceedsStock && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">{t('coupons.newBalance')}</p>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {((driver?.couponBalance ?? 0) + parsed).toLocaleString()}
              </p>
            </div>
          )}

          {exceedsStock && (
            <div className="flex items-start gap-2 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#F87171]" />
              <p className="text-sm text-[#DC2626] dark:text-[#F87171]">
                {t('coupons.exceedsStock', undefined, { count: inventory?.toLocaleString() ?? 0 })}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || exceedsStock || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('coupons.transferCoupons')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AllocateDialog({
  wallet,
  packages,
  onClose,
  onDone,
}: {
  wallet: OperatorWallet | null;
  packages: CouponPackage[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAppContext();
  const [packageId, setPackageId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (wallet) {
      setPackageId(null);
      setAmount('');
    }
  }, [wallet]);

  const activePackages = packages.filter((p) => p.isActive);
  const selected = activePackages.find((p) => p.id === packageId) ?? null;
  const custom = Number(amount);
  const granted = selected ? selected.couponCount : Number.isFinite(custom) ? custom : 0;
  const valid = granted > 0;

  const name = wallet?.operator ? `${wallet.operator.firstName} ${wallet.operator.lastName}`.trim() : t('coupons.operator');

  const submit = async () => {
    if (!wallet || !valid) return;
    setSaving(true);
    try {
      await withStepUp('coupon_allocate', () =>
        api.operatorCoupons.allocate(
          wallet.operatorId,
          selected ? { packageId: selected.id } : { amount: granted }
        )
      );
      toast.success(t('coupons.allocatedTo', undefined, { count: granted, name }));
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.allocationFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!wallet} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('coupons.allocateTo', undefined, { name })}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('coupons.currentlyHolding', undefined, { count: (wallet?.balance ?? 0).toLocaleString() })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {activePackages.length > 0 && (
            <div className="space-y-2">
              <Label>{t('coupons.choosePackage')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {activePackages.map((pkg) => {
                  const isSelected = packageId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => {
                        setPackageId(isSelected ? null : pkg.id);
                        setAmount('');
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{pkg.name}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
                        {pkg.couponCount.toLocaleString()}
                      </p>
                      {pkg.price != null && <p className="text-xs text-muted-foreground">{formatETB(pkg.price)}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="allocate-amount">
              {activePackages.length > 0 ? t('coupons.customAmount') : t('coupons.couponsToAllocate')}
            </Label>
            <Input
              id="allocate-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setPackageId(null);
              }}
              placeholder="0"
              className="h-11 text-lg tabular-nums"
            />
          </div>

          {valid && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">{t('coupons.newInventory')}</p>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {((wallet?.balance ?? 0) + granted).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('coupons.allocate')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequestStockDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useAppContext();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setNote('');
    }
  }, [open]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.couponRequests.create({ amount: parsed, note: note || undefined });
      toast.success(t('coupons.requestSent'));
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.requestFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('coupons.requestMoreTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('coupons.requestInventory')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="request-amount">{t('coupons.howMany')}</Label>
            <Input
              id="request-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-11 text-lg tabular-nums"
              autoFocus
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {[50, 100, 200, 500].map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                  onClick={() => setAmount(String(q))}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-note">{t('coupons.noteOptional')}</Label>
            <Textarea
              id="request-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('coupons.notePlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('coupons.sendRequest')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackageDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { t } = useAppContext();
  const [form, setForm] = useState({ name: '', couponCount: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: '', couponCount: '', price: '', description: '' });
  }, [open]);

  const count = Number(form.couponCount);
  const valid = form.name.trim().length >= 2 && Number.isFinite(count) && count > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.couponPackages.create({
        name: form.name.trim(),
        couponCount: count,
        price: form.price ? Number(form.price) : undefined,
        description: form.description || undefined,
      });
      toast.success(t('coupons.packageCreated', undefined, { name: form.name }));
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? t('coupons.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('coupons.newPackageTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('coupons.createPackageDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">{t('coupons.name')}</Label>
            <Input
              id="pkg-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('coupons.namePlaceholder')}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pkg-count">{t('coupons.coupons')}</Label>
              <Input
                id="pkg-count"
                type="number"
                min={1}
                value={form.couponCount}
                onChange={(e) => setForm({ ...form, couponCount: e.target.value })}
                placeholder="200"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-price">{t('coupons.priceEtb')}</Label>
              <Input
                id="pkg-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="1800"
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-desc">{t('coupons.descriptionOptional')}</Label>
            <Textarea
              id="pkg-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder={t('coupons.descPlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('coupons.createPackage')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
