import { useEffect, useState } from 'react';
import { Search, Phone, Clock, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '../lib/api';
import LogCallDialog from '../components/LogCallDialog';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';
import { useAppContext } from '../contexts/AppContext';
import { Page, PageHeader, FilterBar, Surface } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { EmptyState, StatTile } from '../components/coupons/CouponAtoms';

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const PAGE_SIZE = 20;
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function CallLogs() {
  const { t } = useAppContext();
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<DateRange | undefined>();

  const load = () => {
    setLoading(true);
    api.callLogs
      .list({
        page,
        limit: PAGE_SIZE,
        status: filterStatus === 'all' ? undefined : filterStatus,
        startDate: range?.from ? iso(range.from) : undefined,
        endDate: range?.to ? iso(range.to) : undefined,
      })
      .then((res) => {
        setLogs(res.callLogs ?? []);
        setPagination(res.pagination ?? { page: 1, totalPages: 1, total: res.callLogs?.length ?? 0 });
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load call logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, range]);

  const filtered = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return !q || `${log.customerName ?? ''}${log.customerPhone ?? ''}${log.operatorName ?? ''}`.toLowerCase().includes(q);
  });

  const completed = filtered.filter((c) => c.status === 'completed').length;
  const missed = filtered.filter((c) => c.status === 'missed').length;
  const converted = filtered.filter((c) => c.rideId).length;
  const avg = filtered.length ? Math.round(filtered.reduce((s, c) => s + (c.duration ?? 0), 0) / filtered.length) : 0;
  const conversion = filtered.length ? Math.round((converted / filtered.length) * 100) : 0;

  const exportCsv = () => {
    const header = ['time', 'customer', 'phone', 'operator', 'status', 'duration', 'rideId', 'notes'];
    const rows = filtered.map((log) =>
      [log.timestamp, log.customerName, log.customerPhone, log.operatorName, log.status, log.duration, log.rideId ?? '', log.notes ?? '']
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-logs-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Voice"
        title={t('callLogs.title', 'Call logs')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <LogCallDialog onLogged={() => { setPage(1); load(); }} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('callLogs.totalCalls', 'This page')} value={filtered.length} hint={`${pagination.total} in range`} icon={Phone} />
        <StatTile label={t('callLogs.completed', 'Completed')} value={completed} icon={CheckCircle} accent="#0B7A55" />
        <StatTile label={t('callLogs.missed', 'Missed')} value={missed} icon={XCircle} accent="#AE2E2D" />
        <StatTile label="Call → ride" value={`${conversion}%`} hint={`Avg ${formatDuration(avg)}`} icon={Clock} />
      </div>

      <FilterBar>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('callLogs.searchPlaceholder', 'Search this page by customer, phone, or operator…')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <DateRangePicker
          value={range}
          onChange={(next) => {
            setRange(next);
            setPage(1);
          }}
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => {
            setFilterStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10 w-[180px]"><SelectValue placeholder={t('callLogs.status', 'Status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('callLogs.allStatus', 'All status')}</SelectItem>
            <SelectItem value="completed">{t('callLogs.completed', 'Completed')}</SelectItem>
            <SelectItem value="missed">{t('callLogs.missed', 'Missed')}</SelectItem>
            <SelectItem value="abandoned">{t('callLogs.abandoned', 'Abandoned')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <Surface>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState icon={Phone} title={t('callLogs.noLogs', 'No call logs found')} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {[t('callLogs.time', 'Time'), t('callLogs.customer', 'Customer'), t('callLogs.phone', 'Phone'), t('callLogs.operator', 'Operator'), t('callLogs.status', 'Status'), t('callLogs.duration', 'Duration'), 'Converted', t('callLogs.notes', 'Notes')].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{log.timestamp ? format(new Date(log.timestamp), 'MMM dd, HH:mm') : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{log.customerName ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{log.customerPhone}</td>
                    <td className="px-4 py-3 text-sm">{log.operatorName}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums">{formatDuration(log.duration ?? 0)}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.rideId ? (
                        <span className="font-mono text-primary">#{String(log.rideId).slice(0, 8)}</span>
                      ) : (
                        <span className="text-muted-foreground">No ride</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">{log.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {Math.max(1, pagination.totalPages)} · {pagination.total} calls</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </Page>
  );
}
