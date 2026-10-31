import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { format, subDays } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Loader2,
  Monitor,
  Phone,
  RefreshCw,
  Shield,
  ShieldOff,
  Smartphone,
  Star,
  Ticket,
  TrendingUp,
  Unlink,
  Wallet,
  Wifi,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { api, ApiError, type DriverPerformanceReport } from '../lib/api';
import { formatETB, rideStatusLabel } from '../lib/format';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import GebetaMapView from '../components/GebetaMapView';
import { EmptyState, Initials, StatTile } from '../components/coupons/CouponAtoms';
import DriverPhotoField from '../components/DriverPhotoField';
import { connectSocket, getSocket, subscribeDriver, unsubscribeDriver } from '../lib/socket';
import { patchDriverDuty } from '../lib/fleet';
import { ErrorPage } from './ErrorPage';
import { useAppContext } from '../contexts/AppContext';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * One driver's activity over a date range the administrator chooses.
 *
 * Everything is computed live from rides and the coupon ledger rather than the
 * nightly rollup, so a range that includes today includes today. The four
 * headline figures answer the questions the specification asks first: how many
 * rides, how much earned, how many coupons burned, how long online.
 */
export default function DriverReport() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [report, setReport] = useState<DriverPerformanceReport | null>(null);
  const [driver, setDriver] = useState<any | null>(null);
  const [devices, setDevices] = useState<{ activeDevice: any | null; previousDevices: any[] } | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkReason, setUnlinkReason] = useState('');
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [reportRes, driverRes] = await Promise.all([
        api.drivers.performance(employeeId, {
          startDate: range?.from ? iso(range.from) : undefined,
          endDate: range?.to ? iso(range.to) : undefined,
          page,
          limit: 25,
        }),
        api.drivers.get(employeeId).catch(() => null),
      ]);
      setReport(reportRes);
      if (driverRes) setDriver(driverRes);
      setErrorStatus(null);
    } catch (e: any) {
      const status = e instanceof ApiError ? e.status : 500;
      setErrorStatus(status);
      if (status !== 404) toast.error(e?.message ?? t('drivers.reportLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [employeeId, range, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDevices = useCallback(async () => {
    if (!employeeId) return;
    setDevicesLoading(true);
    try {
      const data = await api.drivers.devices(employeeId);
      setDevices(data);
    } catch {
      // non-blocking
    } finally {
      setDevicesLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Refetch when this driver's work changes underneath the page.
  //
  // The report is computed from rides and the coupon ledger, so a trip
  // completing while an operator has it open silently invalidates every number
  // on screen — the totals, the chart, the ride table. These are the events
  // that change those inputs; anything else is left to the manual refresh.
  useEffect(() => {
    if (!employeeId) return;
    const socket = getSocket() ?? connectSocket();

    const refetchIfMine = (payload: any) => {
      const affected = payload?.driverId ?? payload?.driver?.id;
      if (affected && affected !== employeeId) return;
      load();
    };

    const events = ['ride:completed', 'ride:cancelled', 'coupon:balance'];
    events.forEach((e) => socket.on(e, refetchIfMine));
    // A reconnect may have missed events entirely, so reconcile wholesale.
    socket.io.on('reconnect', load);

    return () => {
      events.forEach((e) => socket.off(e, refetchIfMine));
      socket.io.off('reconnect', load);
    };
  }, [employeeId, load]);

  // Keep the live pin moving, and the duty chip honest, while the report is open.
  //
  // The subscribe call is what makes this work at all: `driver:location` and
  // `driver:status` are only ever emitted into the `driver:{id}` and `map`
  // rooms, so a page that merely attaches a listener without joining one of
  // them never receives a single event. This listener had been dormant.
  useEffect(() => {
    if (!employeeId) return;
    const socket = getSocket() ?? connectSocket();
    subscribeDriver(employeeId);

    const onLocation = (data: any) => {
      if (data?.driverId !== employeeId || typeof data.latitude !== 'number') return;
      setDriver((prev: any) =>
        prev ? { ...prev, currentLocation: { lat: data.latitude, lng: data.longitude } } : prev
      );
    };

    const onStatus = (data: any) => {
      if (data?.driverId !== employeeId) return;
      setDriver((prev: any) => (prev ? patchDriverDuty(prev, data) : prev));
    };

    socket.on('driver:location', onLocation);
    socket.on('driver:status', onStatus);
    return () => {
      socket.off('driver:location', onLocation);
      socket.off('driver:status', onStatus);
      unsubscribeDriver(employeeId);
    };
  }, [employeeId]);

  const summary = report?.summary;
  const name = report?.driver
    ? `${report.driver.firstName} ${report.driver.lastName}`.trim()
    : driver?.name ?? t('common.driver');

  const chartData = useMemo(
    () =>
      (report?.dailySeries ?? []).map((d) => ({
        ...d,
        label: format(new Date(`${d.date}T00:00:00`), 'd MMM'),
      })),
    [report]
  );

  const exportCsv = () => {
    if (!report) return;
    const header = [
      t('drivers.csvRide'),
      t('common.status'),
      t('common.customer'),
      t('rides.pickup'),
      t('rides.dropoff'),
      t('rides.fare'),
      t('rides.tekummaCommission'),
      t('drivers.earnings'),
      t('drivers.csvDistance'),
      t('drivers.csvCompleted'),
    ];
    const rows = report.rides.map((r) => [
      r.id,
      r.status,
      r.customerName,
      r.pickupAddress,
      r.dropoffAddress,
      r.fare ?? '',
      r.commissionAmount ?? '',
      r.driverEarnings ?? '',
      r.distance ?? '',
      r.completedAt ?? r.cancelledAt ?? '',
    ]);

    // Quote every cell - addresses contain commas.
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-${iso(range?.from ?? new Date())}-to-${iso(range?.to ?? new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('drivers.reportExported'));
  };

  if (loading && !report) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report?.driver && !driver) {
    return <ErrorPage status={errorStatus && errorStatus >= 400 ? errorStatus : 404} />;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/drivers')} aria-label={t('drivers.backToDrivers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <DriverPhotoField
            compact
            name={name}
            value={driver?.profilePicture ?? report?.driver?.user?.image ?? null}
            disabled={loading}
            onChange={(next) => {
              if (!employeeId) return;
              const previous = driver?.profilePicture ?? null;
              setDriver((prev: any) => (prev ? { ...prev, profilePicture: next } : prev));
              void api.drivers
                .update(employeeId, { profilePicture: next ?? '' })
                .then((updated) => {
                  setDriver((prev: any) => (prev ? { ...prev, profilePicture: updated.profilePicture ?? next } : prev));
                  toast.success(next ? t('common.photoUpdated') : t('common.photoRemoved'));
                })
                .catch((e: any) => {
                  setDriver((prev: any) => (prev ? { ...prev, profilePicture: previous } : prev));
                  toast.error(e?.message ?? t('common.photoSaveFailed'));
                });
            }}
          />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('drivers.driverReport')}</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="capitalize">
                {report?.driver?.vehicleType ?? driver?.vehicleType ?? '-'} ·{' '}
                {report?.driver?.vehiclePlate ?? driver?.licensePlate ?? '-'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                <span className="tabular-nums">{(report?.driver?.rating ?? driver?.rating ?? 0).toFixed(1)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" />
                <span className="tabular-nums">{summary?.currentCouponBalance ?? 0}</span> {t('drivers.couponsLabel')}
              </span>
              {report?.driver?.commissionPercent != null && (
                <span>
                  {t('drivers.commissionRate', undefined, { percent: report.driver.commissionPercent })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
            align="end"
          />
          <Button variant="outline" onClick={exportCsv} disabled={!report?.rides.length}>
            <Download className="mr-2 h-4 w-4" /> {t('common.export')}
          </Button>
        </div>
      </header>

      {/* The four figures the report exists to answer. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t('drivers.completedRides')}
          value={(summary?.completedRides ?? 0).toLocaleString()}
          hint={
            summary?.cancelledRides
              ? t('drivers.cancelledInPeriod', undefined, { count: summary.cancelledRides })
              : t('drivers.noneCancelled')
          }
          icon={CheckCircle2}
          accent="#10B981"
        />
        <StatTile
          label={t('drivers.driverEarnings')}
          value={formatETB(summary?.totalEarnings ?? 0)}
          hint={t('drivers.faresCommission', undefined, {
            fares: formatETB(summary?.totalFare ?? 0),
            commission: formatETB(summary?.totalCommission ?? 0),
          })}
          icon={Wallet}
        />
        <StatTile
          label={t('drivers.couponsDeducted')}
          value={formatETB(summary?.totalCommission ?? 0)}
          hint={
            summary?.couponsRefunded
              ? t('drivers.refundedNet', undefined, {
                  refunded: summary.couponsRefunded,
                  net: summary.netCouponsSpent,
                })
              : t('drivers.commissionFromWallet')
          }
          icon={Ticket}
          accent="#6366F1"
        />
        <StatTile
          label={t('drivers.onlineHours')}
          value={(summary?.onlineHours ?? 0).toFixed(1)}
          hint={t('drivers.drivingHint', undefined, {
            hours: (summary?.drivingHours ?? 0).toFixed(1),
            km: (summary?.distanceKm ?? 0).toFixed(0),
          })}
          icon={Clock}
          accent="#F59E0B"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend */}
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">{t('drivers.dailyActivity')}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {range?.from && range?.to
                ? `${format(range.from, 'd MMM')} - ${format(range.to, 'd MMM yyyy')}`
                : t('drivers.selectedPeriod')}
            </span>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                {t('drivers.noCompletedPeriod')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="ridesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00BDC3" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00BDC3" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    allowDecimals={false}
                    width={36}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--card-foreground)',
                      fontSize: 12,
                    }}
                    formatter={(value: number, key: string) =>
                      key === 'rides'
                        ? [t('drivers.ridesCount', undefined, { count: value }), t('nav.rides')]
                        : [formatETB(value), t('drivers.earnings')]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="rides"
                    stroke="#00BDC3"
                    strokeWidth={2.5}
                    fill="url(#ridesFill)"
                    dot={{ r: 2.5, fill: '#00BDC3', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Secondary measures */}
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('drivers.performance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Measure
              icon={TrendingUp}
              label={t('drivers.acceptanceRate')}
              value={summary?.acceptanceRate != null ? `${summary.acceptanceRate}%` : '-'}
              hint={
                summary?.offeredRides
                  ? t('drivers.ofOffers', undefined, {
                      accepted: summary.acceptedRides,
                      offered: summary.offeredRides,
                    })
                  : t('drivers.noOffers')
              }
            />
            <Measure
              icon={Star}
              label={t('drivers.riderRating')}
              value={summary?.averageCustomerRating != null ? summary.averageCustomerRating.toFixed(1) : '-'}
              hint={t('drivers.lifetimeAverage', undefined, { rating: (summary?.currentRating ?? 0).toFixed(1) })}
            />
            <Measure
              icon={Gauge}
              label={t('drivers.distanceDriven')}
              value={t('rides.kmValue', undefined, { n: (summary?.distanceKm ?? 0).toFixed(1) })}
              hint={t('drivers.hoursOnTrips', undefined, { hours: (summary?.drivingHours ?? 0).toFixed(1) })}
            />
            <Measure
              icon={Ticket}
              label={t('drivers.netCouponsSpent')}
              value={formatETB(summary?.netCouponsSpent ?? 0)}
              hint={t('drivers.chargedRefunded', undefined, {
                charged: summary?.couponsDeducted ?? 0,
                refunded: summary?.couponsRefunded ?? 0,
              })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Ride history for the period */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {t('drivers.rideHistory')}{' '}
            <span className="font-normal text-muted-foreground">({report?.pagination.total ?? 0})</span>
          </CardTitle>
          {(report?.pagination.totalPages ?? 1) > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common.previous')}
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {page} / {report?.pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (report?.pagination.totalPages ?? 1) || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {report?.rides.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('drivers.date')}</TableHead>
                    <TableHead>{t('common.customer')}</TableHead>
                    <TableHead>{t('drivers.route')}</TableHead>
                    <TableHead className="text-right">{t('rides.fare')}</TableHead>
                    <TableHead className="text-right">{t('rides.tekummaCommission')}</TableHead>
                    <TableHead className="text-right">{t('drivers.earnings')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rides.map((ride) => (
                    <TableRow
                      key={ride.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/rides/${ride.id}`)}
                    >
                      <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {format(new Date(ride.completedAt ?? ride.cancelledAt ?? ride.createdAt), 'd MMM, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{ride.customerName}</TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {ride.pickupAddress} → {ride.dropoffAddress}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {ride.fare != null ? formatETB(ride.fare) : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                        {ride.commissionAmount != null ? formatETB(ride.commissionAmount) : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-[#059669] dark:text-[#34D399]">
                        {ride.driverEarnings != null ? formatETB(ride.driverEarnings) : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ride.status} label={rideStatusLabel(ride.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title={t('drivers.noRidesPeriod')}
            />
          )}
        </CardContent>
      </Card>

      {/* Linked Hardware & Device Security */}
      <LinkedDevicesCard
        driverId={employeeId ?? ''}
        driverName={name}
        devices={devices}
        loading={devicesLoading}
        unlinkOpen={unlinkOpen}
        unlinkReason={unlinkReason}
        unlinkLoading={unlinkLoading}
        onOpenUnlink={() => setUnlinkOpen(true)}
        onCloseUnlink={() => { setUnlinkOpen(false); setUnlinkReason(''); }}
        onReasonChange={setUnlinkReason}
        onConfirmUnlink={async () => {
          if (!employeeId) return;
          setUnlinkLoading(true);
          try {
            await api.drivers.unlinkDevice(employeeId, { reason: unlinkReason || 'Admin action' });
            toast.success('Device unlinked. Driver session terminated.');
            setUnlinkOpen(false);
            setUnlinkReason('');
            await loadDevices();
          } catch (e: any) {
            toast.error(e?.message ?? 'Failed to unlink device');
          } finally {
            setUnlinkLoading(false);
          }
        }}
        onRefresh={loadDevices}
      />

      {/* Live position */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t('drivers.liveLocation')}</CardTitle>
          {driver?.currentLocation && (
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
              {t('common.live')}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {driver?.currentLocation ? (
            <GebetaMapView
              driver={driver.currentLocation}
              driverName={name}
              driverPhoto={driver?.profilePicture ?? report?.driver?.user?.image ?? null}
              driverStatus={t('common.live')}
              driverDetail={
                [
                  report?.driver?.vehicleType ?? driver?.vehicleType,
                  report?.driver?.vehiclePlate ?? driver?.licensePlate,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              height={300}
              zoom={14}
              className="w-full"
              overlay={
                <div className="pointer-events-auto absolute left-3 top-3 max-w-[min(100%-4.5rem,20rem)] rounded-2xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-md backdrop-blur">
                  <div className="flex items-center gap-2">
                    <Initials
                      name={name}
                      src={driver?.profilePicture ?? report?.driver?.user?.image}
                      className="h-8 w-8 text-[10px]"
                    />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('common.live')}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(report?.driver?.vehicleType ?? driver?.vehicleType ?? t('common.vehicle'))}
                    {(report?.driver?.vehiclePlate ?? driver?.licensePlate) ? ` · ${report?.driver?.vehiclePlate ?? driver?.licensePlate}` : ''}
                  </p>
                  {(driver?.phone ?? driver?.user?.phoneNumber) && (
                    <Button size="sm" variant="outline" className="mt-2" asChild>
                      <a href={`tel:${driver.phone ?? driver.user?.phoneNumber}`}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> {t('drivers.callDriver')}
                      </a>
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('drivers.noLocation')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Measure({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

// ─── Linked Devices Card ─────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return format(new Date(iso), 'd MMM yyyy');
}

function deviceIcon(name?: string) {
  const n = (name ?? '').toLowerCase();
  if (
    n.includes('web') ||
    n.includes('chrome') ||
    n.includes('firefox') ||
    n.includes('safari') ||
    n.includes('edge') ||
    n.includes('browser')
  ) {
    return Monitor;
  }
  return Smartphone;
}

function LinkedDevicesCard({
  driverName,
  devices,
  loading,
  unlinkOpen,
  unlinkReason,
  unlinkLoading,
  onOpenUnlink,
  onCloseUnlink,
  onReasonChange,
  onConfirmUnlink,
  onRefresh,
}: {
  driverId: string;
  driverName: string;
  devices: { activeDevice: any | null; previousDevices: any[] } | null;
  loading: boolean;
  unlinkOpen: boolean;
  unlinkReason: string;
  unlinkLoading: boolean;
  onOpenUnlink: () => void;
  onCloseUnlink: () => void;
  onReasonChange: (v: string) => void;
  onConfirmUnlink: () => Promise<void>;
  onRefresh: () => void;
}) {
  const active = devices?.activeDevice;
  const prev = devices?.previousDevices ?? [];
  const DevIcon = deviceIcon(active?.deviceName);

  return (
    <>
      <Card className="overflow-hidden border-border/70">
        {/* Header */}
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Linked Hardware &amp; Terminal</CardTitle>
                <p className="text-[11px] text-muted-foreground">Single-device fleet security policy</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && !devices ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !active ? (
            /* No device linked */
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40">
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No Device Linked</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {driverName.trim() || 'This driver'} has not logged in from any device yet.
                </p>
              </div>
            </div>
          ) : (
            /* Active device */
            <div className="p-5">
              <div className="relative overflow-hidden rounded-2xl border border-[#00BDC3]/25 bg-gradient-to-br from-[#00BDC3]/5 via-transparent to-primary/5 p-5 shadow-sm">
                {/* Live pulse */}
                <span className="absolute right-4 top-4 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                </span>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00BDC3]/10 ring-1 ring-[#00BDC3]/20">
                    <DevIcon className="h-5 w-5 text-[#00BDC3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{active.deviceName ?? 'Unknown Device'}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#10B981] ring-1 ring-[#10B981]/20">
                        <Wifi className="h-2.5 w-2.5" /> Active
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      ID: {active.deviceId?.substring(0, 16)}&hellip;
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {active.ipAddress && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="font-medium text-foreground/70">IP</span>
                          <span className="font-mono">{active.ipAddress}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground/70">Enrolled</span>
                        <span>{timeAgo(active.enrolledAt)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground/70">Last seen</span>
                        <span>{timeAgo(active.lastUsedAt)}</span>
                      </span>
                    </div>

                    {active.userAgent && (
                      <p className="mt-2 truncate text-[10px] text-muted-foreground/60">
                        {active.userAgent.substring(0, 90)}
                        {active.userAgent.length > 90 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Unlink action */}
                <div className="mt-4 flex justify-end border-t border-border/40 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenUnlink}
                    className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink Device
                  </Button>
                </div>
              </div>

              {/* Previous devices history */}
              {prev.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Previous Terminals ({prev.length})
                  </p>
                  <div className="space-y-2">
                    {prev.map((d: any) => {
                      const PIcon = deviceIcon(d.deviceName);
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <PIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground/80">
                              {d.deviceName ?? 'Unknown Device'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {d.revokedAt
                                ? `Unlinked ${timeAgo(d.revokedAt)}`
                                : `Last used ${timeAgo(d.lastUsedAt)}`}
                            </p>
                          </div>
                          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
                            <AlertTriangle className="h-2.5 w-2.5" /> Revoked
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlink confirmation dialog */}
      <Dialog open={unlinkOpen} onOpenChange={(o) => { if (!o) onCloseUnlink(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Unlink className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Unlink Driver Device</DialogTitle>
            <DialogDescription>
              This will immediately revoke the linked device and terminate the driver&apos;s active session.
              The driver will need to log in again from any device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-foreground">Reason for unlinking</label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="e.g. Device lost, stolen, or replaced…"
              value={unlinkReason}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onCloseUnlink} disabled={unlinkLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmUnlink}
              disabled={unlinkLoading}
              className="gap-1.5"
            >
              {unlinkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
              Confirm Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
