import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PhoneCall, Users, Car, DollarSign, CheckCircle, XCircle, Activity, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatETB } from '../lib/format';
import { useAppContext } from '../contexts/AppContext';

export default function Analytics() {
  const { t } = useAppContext();
  const [timeRange, setTimeRange] = useState('today');
  const [stats, setStats] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dashboard.stats(timeRange), api.operators.list({ limit: 100 }).catch(() => ({ operators: [] }))])
      .then(([s, ops]) => {
        setStats(s);
        setOperators(ops.operators ?? []);
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [timeRange]);

  if (loading || !stats) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>;
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const metrics = [
    { label: t('analytics.totalRides', 'Total Rides'), value: stats.totalRides ?? 0, icon: Car, color: '#00BDC3' },
    { label: t('analytics.totalRevenue', 'Total Revenue'), value: formatETB(stats.totalRevenue), icon: DollarSign, color: '#10B981' },
    { label: t('analytics.activeDrivers', 'Active Drivers'), value: `${stats.activeDrivers ?? 0}/${stats.totalDrivers ?? 0}`, icon: Users, color: '#00BDC3' },
    { label: t('analytics.totalCalls', 'Total Calls'), value: stats.totalCalls ?? 0, icon: PhoneCall, color: '#00BDC3' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('analytics.title', 'Analytics & Reports')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('analytics.subtitle', 'Overview of dispatch performance')}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('analytics.today', 'Today')}</SelectItem>
            <SelectItem value="week">{t('analytics.week', 'This Week')}</SelectItem>
            <SelectItem value="month">{t('analytics.month', 'This Month')}</SelectItem>
            <SelectItem value="year">{t('analytics.year', 'This Year')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{m.label}</p><p className="text-2xl font-semibold mt-1" style={{ color: m.color }}>{m.value}</p></div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${m.color}1a` }}><m.icon className="w-6 h-6" style={{ color: m.color }} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('analytics.completedRides', 'Completed Rides')}</p><p className="text-2xl font-semibold text-[#10B981] mt-1">{stats.completedRides ?? 0}</p><p className="text-xs text-muted-foreground mt-1">{t('analytics.completedPercent', '{0}% of total', { 0: pct(stats.completedRides, stats.totalRides) })}</p></div>
            <CheckCircle className="w-10 h-10 text-[#10B981]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('analytics.cancelledRides', 'Cancelled Rides')}</p><p className="text-2xl font-semibold text-[#EF4444] mt-1">{stats.cancelledRides ?? 0}</p><p className="text-xs text-muted-foreground mt-1">{t('analytics.completedPercent', '{0}% of total', { 0: pct(stats.cancelledRides, stats.totalRides) })}</p></div>
            <XCircle className="w-10 h-10 text-[#EF4444]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{t('analytics.activeRides', 'Active Rides')}</p><p className="text-2xl font-semibold text-[#00BDC3] mt-1">{stats.activeRides ?? 0}</p><p className="text-xs text-muted-foreground mt-1">{t('analytics.avgFare', 'Avg fare {0}', { 0: formatETB(stats.averageFare) })}</p></div>
            <Activity className="w-10 h-10 text-[#00BDC3]" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t('analytics.operatorPerformance', 'Operator Performance')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[t('analytics.operator', 'Operator'), t('analytics.status', 'Status'), t('analytics.shift', 'Shift'), t('analytics.ridesCreated', 'Rides Created'), t('analytics.totalCalls', 'Total Calls')].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{op.name}</td>
                    <td className="py-3 px-4"><Badge className={op.status === 'active' ? 'bg-[#10B981] text-white' : 'bg-[#6B7280] text-white'}>{op.status === 'active' ? t('analytics.active', 'active') : op.status}</Badge></td>
                    <td className="py-3 px-4 text-sm text-muted-foreground capitalize">{op.shift === 'morning' ? t('analytics.morning', 'Morning') : op.shift}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{op.totalRidesCreated ?? 0}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{(op.totalCalls ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
                {operators.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t('analytics.noOperators', 'No operators yet')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
