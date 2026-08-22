import { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Users, Car, DollarSign, Loader2, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { format, parseISO, subDays } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { formatETB, rideStatusLabel } from '../lib/format';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, Surface, Facet } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { StatTile } from '../components/coupons/CouponAtoms';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const PRIMARY = '#00b4bb';
const SUCCESS = '#1aa37a';
const DANGER = '#e24b4a';
const WARN = '#e08a14';
const INK = '#4f7cff';

const STATUS_COLOR: Record<string, string> = {
  completed: SUCCESS,
  cancelled: DANGER,
  expired: '#7a9193',
  pending: WARN,
  unassigned: WARN,
  dispatched: PRIMARY,
  accepted: PRIMARY,
  arrived: PRIMARY,
  in_progress: INK,
};

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  fontSize: 12,
  boxShadow: '0 18px 40px -24px rgba(5,50,54,.45)',
};

function fmtDuration(seconds: number) {
  if (!seconds) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

function fmtMinutes(minutes: number) {
  if (!minutes) return '-';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  return `${minutes.toFixed(1)} min`;
}

type SeriesPoint = {
  date: string;
  rides: number;
  completed: number;
  cancelled: number;
  revenue: number;
  calls: number;
};

export default function Analytics() {
  const { t } = useAppContext();
  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 6), to: new Date() });
  const [chart, setChart] = useState<'volume' | 'revenue'>('volume');
  const [stats, setStats] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const first = !stats;
    if (first) setLoading(true);
    else setRefreshing(true);
    Promise.all([
      api.dashboard.stats({
        startDate: range?.from ? iso(range.from) : undefined,
        endDate: range?.to ? iso(range.to) : undefined,
      }),
      api.operators.list({ limit: 100 }).catch(() => ({ operators: [] })),
    ])
      .then(([s, ops]) => {
        setStats(s);
        setOperators(ops.operators ?? []);
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load analytics'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const series: SeriesPoint[] = stats?.series ?? [];
  const byStatus: Array<{ status: string; count: number }> = stats?.byStatus ?? [];
  const byHour: Array<{ hour: number; rides: number }> = stats?.byHour ?? [];
  const topRoutes: Array<{ pickup: string; dropoff: string; rides: number; revenue: number }> = stats?.topRoutes ?? [];
  const ops = stats?.ops ?? {};

  const chartData = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        label: format(parseISO(row.date), series.length > 14 ? 'd MMM' : 'EEE d'),
      })),
    [series]
  );

  const statusData = useMemo(
    () =>
      [...byStatus]
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((row) => ({
          ...row,
          name: rideStatusLabel(row.status),
          fill: STATUS_COLOR[row.status] ?? '#7a9193',
        })),
    [byStatus]
  );

  const hourData = useMemo(
    () => byHour.map((row) => ({ ...row, label: `${String(row.hour).padStart(2, '0')}` })),
    [byHour]
  );

  const peakHour = useMemo(() => {
    if (!byHour.length) return null;
    return [...byHour].sort((a, b) => b.rides - a.rides)[0];
  }, [byHour]);

  const leaderboard = useMemo(
    () =>
      [...operators]
        .map((op) => {
          const calls = op.totalCalls ?? 0;
          const rides = op.totalRidesCreated ?? 0;
          return { ...op, calls, rides, rate: calls ? Math.round((rides / calls) * 100) : 0 };
        })
        .sort((a, b) => b.rides - a.rides),
    [operators]
  );

  const operatorBars = leaderboard.slice(0, 8).map((op) => ({
    name: String(op.name ?? 'Operator').split(' ')[0],
    rides: op.rides,
    calls: op.calls,
  }));

  const exportCsv = () => {
    const header = ['date', 'rides', 'completed', 'cancelled', 'revenue', 'calls'];
    const rows = series.map((row) =>
      [row.date, row.rides, row.completed, row.cancelled, row.revenue, row.calls].join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasVolume = series.some((row) => row.rides > 0 || row.calls > 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Performance"
        title={t('analytics.title', 'Analytics')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <DateRangePicker value={range} onChange={setRange} align="end" />
            <Button variant="outline" onClick={exportCsv} disabled={!series.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('analytics.totalRides', 'Rides')} value={stats.totalRides ?? 0} icon={Car} />
        <StatTile
          label={t('analytics.totalRevenue', 'Revenue')}
          value={formatETB(stats.totalRevenue)}
          icon={DollarSign}
          accent={SUCCESS}
        />
        <StatTile
          label={t('analytics.activeDrivers', 'Online now')}
          value={`${stats.activeDrivers ?? 0}/${stats.totalDrivers ?? 0}`}
          icon={Users}
        />
        <StatTile label={t('analytics.totalCalls', 'Calls')} value={stats.totalCalls ?? 0} icon={PhoneCall} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <Surface className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold">Trend</h3>
            <div className="flex gap-1">
              <Facet active={chart === 'volume'} onClick={() => setChart('volume')}>
                Rides
              </Facet>
              <Facet active={chart === 'revenue'} onClick={() => setChart('revenue')}>
                Revenue
              </Facet>
            </div>
          </div>
          {!hasVolume ? (
            <EmptyChart />
          ) : chart === 'volume' ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="ridesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="doneFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SUCCESS} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={SUCCESS} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-muted-foreground" minTickGap={22} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} width={36} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, key: string) => [
                    value,
                    key === 'completed' ? 'Completed' : key === 'calls' ? 'Calls' : 'Rides',
                  ]}
                />
                <Area type="monotone" dataKey="rides" stroke={PRIMARY} strokeWidth={2.4} fill="url(#ridesFill)" />
                <Area type="monotone" dataKey="completed" stroke={SUCCESS} strokeWidth={2} fill="url(#doneFill)" />
                <Line type="monotone" dataKey="calls" stroke={INK} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WARN} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={WARN} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-muted-foreground" minTickGap={22} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="text-muted-foreground" width={52} tickFormatter={(v) => `${Math.round(v)}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatETB(value), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={WARN} strokeWidth={2.4} fill="url(#revFill)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {chart === 'volume' ? (
              <>
                <LegendDot color={PRIMARY} label="Rides" />
                <LegendDot color={SUCCESS} label="Completed" />
                <LegendDot color={INK} label="Calls" />
              </>
            ) : (
              <LegendDot color={WARN} label="Completed fare" />
            )}
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="mb-1 font-display text-base font-semibold">Outcome mix</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {Math.round(ops.completionRate ?? 0)}% completed · {Math.round(ops.cancelRate ?? 0)}% cancelled
          </p>
          {statusData.length === 0 ? (
            <EmptyChart height={200} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="var(--card)">
                    {statusData.map((row) => (
                      <Cell key={row.status} fill={row.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {statusData.slice(0, 5).map((row) => (
                  <li key={row.status} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: row.fill }} />
                      {row.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-base font-semibold">Busy hours</h3>
            {peakHour && peakHour.rides > 0 && (
              <p className="text-xs text-muted-foreground">
                Peak {String(peakHour.hour).padStart(2, '0')}:00 · {peakHour.rides} rides
              </p>
            )}
          </div>
          {hourData.every((row) => row.rides === 0) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={1} className="text-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={28} className="text-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, 'Rides']} />
                <Bar dataKey="rides" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Surface>

        <Surface className="grid grid-cols-1 gap-0 divide-y divide-border/70">
          <Metric label="Avg assign time" value={fmtDuration(ops.avgDispatchSeconds ?? 0)} />
          <Metric label="Avg pickup" value={fmtMinutes(ops.avgPickupMinutes ?? 0)} />
          <Metric label="Avg trip" value={fmtMinutes(ops.avgTripMinutes ?? 0)} />
          <Metric label="Avg fare" value={formatETB(stats.averageFare)} />
          <Metric label="Active now" value={String(stats.activeRides ?? 0)} />
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Surface>
          <div className="border-b border-border/70 px-5 py-4">
            <h3 className="font-display text-base font-semibold">Top routes</h3>
          </div>
          {topRoutes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No completed trips in this range</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {topRoutes.map((route, i) => (
                <li key={`${route.pickup}-${route.dropoff}-${i}`} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{route.pickup}</p>
                    <p className="truncate text-xs text-muted-foreground">{route.dropoff}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{route.rides}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatETB(route.revenue)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Operator volume</h3>
          {operatorBars.length === 0 ? (
            <EmptyChart height={200} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, operatorBars.length * 36)}>
              <BarChart data={operatorBars} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="rides" fill={PRIMARY} radius={[0, 8, 8, 0]} maxBarSize={16} name="Rides" />
                <Bar dataKey="calls" fill={INK} radius={[0, 8, 8, 0]} maxBarSize={16} name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Surface>
      </div>

      <Surface>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-semibold">{t('analytics.operatorPerformance', 'Operator productivity')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['#', t('analytics.operator', 'Operator'), t('analytics.status', 'Status'), t('analytics.shift', 'Shift'), t('analytics.ridesCreated', 'Rides'), t('analytics.totalCalls', 'Calls'), 'Conversion'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((op, index) => (
                <tr key={op.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{op.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={op.status === 'active' ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{op.shift}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{op.rides}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{op.calls.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, op.rate)}%` }} />
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{op.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {operators.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t('analytics.noOperators', 'No operators yet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </Page>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyChart({ height = 240 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      No trips in this range
    </div>
  );
}
