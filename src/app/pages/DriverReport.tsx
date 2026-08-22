import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { format, subDays } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Loader2,
  Phone,
  Star,
  Ticket,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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
import { connectSocket, getSocket } from '../lib/socket';
import { ErrorPage } from './ErrorPage';

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

  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [report, setReport] = useState<DriverPerformanceReport | null>(null);
  const [driver, setDriver] = useState<any | null>(null);
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
      if (status !== 404) toast.error(e?.message ?? 'Could not load the driver report');
    } finally {
      setLoading(false);
    }
  }, [employeeId, range, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the live map pin moving while the report is open.
  useEffect(() => {
    if (!employeeId) return;
    const socket = getSocket() ?? connectSocket();
    const onLocation = (data: any) => {
      if (data?.driverId !== employeeId || typeof data.latitude !== 'number') return;
      setDriver((prev: any) =>
        prev ? { ...prev, currentLocation: { lat: data.latitude, lng: data.longitude } } : prev
      );
    };
    socket.on('driver:location', onLocation);
    return () => {
      socket.off('driver:location', onLocation);
    };
  }, [employeeId]);

  const summary = report?.summary;
  const name = report?.driver
    ? `${report.driver.firstName} ${report.driver.lastName}`.trim()
    : driver?.name ?? 'Driver';

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
    const header = ['Ride', 'Status', 'Customer', 'Pickup', 'Dropoff', 'Fare', 'Earnings', 'Commission', 'Distance km', 'Completed'];
    const rows = report.rides.map((r) => [
      r.id,
      r.status,
      r.customerName,
      r.pickupAddress,
      r.dropoffAddress,
      r.fare ?? '',
      r.driverEarnings ?? '',
      r.commissionAmount ?? '',
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
    toast.success('Report exported');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/drivers')} aria-label="Back to drivers">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Initials name={name} className="h-12 w-12" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Driver report</p>
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
                <span className="tabular-nums">{summary?.currentCouponBalance ?? 0}</span> coupons
              </span>
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
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      {/* The four figures the report exists to answer. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Completed rides"
          value={(summary?.completedRides ?? 0).toLocaleString()}
          hint={
            summary?.cancelledRides
              ? `${summary.cancelledRides} cancelled in the period`
              : 'None cancelled in the period'
          }
          icon={CheckCircle2}
          accent="#10B981"
        />
        <StatTile
          label="Driver earnings"
          value={formatETB(summary?.totalEarnings ?? 0)}
          hint={`${formatETB(summary?.totalFare ?? 0)} in fares · ${formatETB(summary?.totalCommission ?? 0)} commission`}
          icon={Wallet}
        />
        <StatTile
          label="Coupons deducted"
          value={(summary?.couponsDeducted ?? 0).toLocaleString()}
          hint={
            summary?.couponsRefunded
              ? `${summary.couponsRefunded} refunded · ${summary.netCouponsSpent} net`
              : 'None refunded'
          }
          icon={Ticket}
          accent="#6366F1"
        />
        <StatTile
          label="Online hours"
          value={(summary?.onlineHours ?? 0).toFixed(1)}
          hint={`${(summary?.drivingHours ?? 0).toFixed(1)}h driving · ${(summary?.distanceKm ?? 0).toFixed(0)} km`}
          icon={Clock}
          accent="#F59E0B"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend */}
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Daily activity</CardTitle>
            <span className="text-xs text-muted-foreground">
              {range?.from && range?.to
                ? `${format(range.from, 'd MMM')} - ${format(range.to, 'd MMM yyyy')}`
                : 'Selected period'}
            </span>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No completed rides in this period.
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
                      key === 'rides' ? [`${value} rides`, 'Rides'] : [formatETB(value), 'Earnings']
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
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Measure
              icon={TrendingUp}
              label="Acceptance rate"
              value={summary?.acceptanceRate != null ? `${summary.acceptanceRate}%` : '-'}
              hint={
                summary?.offeredRides
                  ? `${summary.acceptedRides} of ${summary.offeredRides} offers`
                  : 'No offers in this period'
              }
            />
            <Measure
              icon={Star}
              label="Rider rating"
              value={summary?.averageCustomerRating != null ? summary.averageCustomerRating.toFixed(1) : '-'}
              hint={`Lifetime average ${(summary?.currentRating ?? 0).toFixed(1)}`}
            />
            <Measure
              icon={Gauge}
              label="Distance driven"
              value={`${(summary?.distanceKm ?? 0).toFixed(1)} km`}
              hint={`${(summary?.drivingHours ?? 0).toFixed(1)} hours on trips`}
            />
            <Measure
              icon={Ticket}
              label="Net coupons spent"
              value={(summary?.netCouponsSpent ?? 0).toLocaleString()}
              hint={`${summary?.couponsDeducted ?? 0} charged · ${summary?.couponsRefunded ?? 0} refunded`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Ride history for the period */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Ride history{' '}
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
                Previous
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
                Next
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
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Fare</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead>Status</TableHead>
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
              title="No rides in this period"
            />
          )}
        </CardContent>
      </Card>

      {/* Live position */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Live location</CardTitle>
          {driver?.currentLocation && (
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
              Live
            </span>
          )}
        </CardHeader>
        <CardContent>
          {driver?.currentLocation ? (
            <GebetaMapView
              driver={driver.currentLocation}
              driverName={name}
              driverPhoto={driver?.profilePicture ?? null}
              height={300}
              zoom={14}
              className="w-full"
              overlay={
                <div className="pointer-events-auto absolute left-3 top-3 max-w-[min(100%-4.5rem,20rem)] rounded-2xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-md backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Live</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(report?.driver?.vehicleType ?? driver?.vehicleType ?? 'Vehicle')}
                    {(report?.driver?.vehiclePlate ?? driver?.licensePlate) ? ` · ${report?.driver?.vehiclePlate ?? driver?.licensePlate}` : ''}
                  </p>
                  {(driver?.phone ?? driver?.user?.phoneNumber) && (
                    <Button size="sm" variant="outline" className="mt-2" asChild>
                      <a href={`tel:${driver.phone ?? driver.user?.phoneNumber}`}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Call driver
                      </a>
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No location reported - this driver hasn’t gone online with GPS on.
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
