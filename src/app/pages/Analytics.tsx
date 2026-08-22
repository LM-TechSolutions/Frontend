import { useEffect, useState } from 'react';
import { PhoneCall, Users, Car, DollarSign, CheckCircle, XCircle, Activity, Loader2, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '../lib/api';
import { formatETB } from '../lib/format';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, Surface } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { StatTile } from '../components/coupons/CouponAtoms';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function Analytics() {
  const { t } = useAppContext();
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [stats, setStats] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
      .finally(() => setLoading(false));
  }, [range]);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const exportCsv = () => {
    const header = ['operator', 'status', 'shift', 'rides', 'calls', 'conversion'];
    const rows = operators.map((op) => {
      const calls = op.totalCalls ?? 0;
      const rides = op.totalRidesCreated ?? 0;
      const rate = calls ? Math.round((rides / calls) * 100) : 0;
      return [op.name, op.status, op.shift, rides, calls, `${rate}%`].join(',');
    });
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-operators-${iso(new Date())}.csv`;
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

  const completion = pct(stats.completedRides, stats.totalRides);
  const cancel = pct(stats.cancelledRides, stats.totalRides);
  const leaderboard = [...operators].sort((a, b) => (b.totalRidesCreated ?? 0) - (a.totalRidesCreated ?? 0));

  return (
    <Page>
      <PageHeader
        eyebrow="Performance"
        title={t('analytics.title', 'Analytics')}
        actions={
          <div className="flex flex-wrap gap-2">
            <DateRangePicker value={range} onChange={setRange} align="end" />
            <Button variant="outline" onClick={exportCsv} disabled={!operators.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('analytics.totalRides', 'Total rides')} value={stats.totalRides ?? 0} icon={Car} />
        <StatTile label={t('analytics.totalRevenue', 'Revenue')} value={formatETB(stats.totalRevenue)} icon={DollarSign} accent="#0B7A55" />
        <StatTile
          label={t('analytics.activeDrivers', 'Active drivers')}
          value={`${stats.activeDrivers ?? 0}/${stats.totalDrivers ?? 0}`}
          icon={Users}
        />
        <StatTile label={t('analytics.totalCalls', 'Calls')} value={stats.totalCalls ?? 0} icon={PhoneCall} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('analytics.completedRides', 'Completed')}</p>
              <p className="mt-1 text-2xl font-semibold text-[#0B7A55]">{stats.completedRides ?? 0}</p>
            </div>
            <CheckCircle className="h-9 w-9 text-[#0B7A55]" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#0B7A55]" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{completion}% of rides in range</p>
        </Surface>
        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('analytics.cancelledRides', 'Cancelled')}</p>
              <p className="mt-1 text-2xl font-semibold text-[#AE2E2D]">{stats.cancelledRides ?? 0}</p>
            </div>
            <XCircle className="h-9 w-9 text-[#AE2E2D]" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#AE2E2D]" style={{ width: `${cancel}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{cancel}% of rides in range</p>
        </Surface>
        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('analytics.activeRides', 'Active now')}</p>
              <p className="mt-1 text-2xl font-semibold text-primary">{stats.activeRides ?? 0}</p>
            </div>
            <Activity className="h-9 w-9 text-primary" />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            {t('analytics.avgFare', 'Avg fare {0}', { 0: formatETB(stats.averageFare) })}
          </p>
        </Surface>
      </div>

      <Surface>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-semibold">{t('analytics.operatorPerformance', 'Operator productivity')}</h3>
          <p className="text-xs text-muted-foreground">Ranked by rides created</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['#', t('analytics.operator', 'Operator'), t('analytics.status', 'Status'), t('analytics.shift', 'Shift'), t('analytics.ridesCreated', 'Rides'), t('analytics.totalCalls', 'Calls'), 'Conversion'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((op, index) => {
                const calls = op.totalCalls ?? 0;
                const rides = op.totalRidesCreated ?? 0;
                const rate = calls ? Math.round((rides / calls) * 100) : 0;
                return (
                  <tr key={op.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{op.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={op.status === 'active' ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-muted-foreground">{op.shift}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{rides}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{calls.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums">{rate}%</td>
                  </tr>
                );
              })}
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
