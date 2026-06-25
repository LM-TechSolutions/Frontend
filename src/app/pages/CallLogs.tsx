import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search, Phone, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { api } from '../lib/api';
import LogCallDialog from '../components/LogCallDialog';

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const statusColor = (status: string) =>
  ({
    completed: 'bg-[#10B981]/10 text-[#10B981]',
    missed: 'bg-[#EF4444]/10 text-[#EF4444]',
    abandoned: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  } as any)[status] || 'bg-gray-100 text-gray-600';
const statusIcon = (status: string) =>
  status === 'completed' ? <CheckCircle className="w-4 h-4" /> : status === 'missed' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;

export default function CallLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = () => {
    setLoading(true);
    api.callLogs
      .list({ limit: 200 })
      .then((res) => setLogs(res.callLogs ?? []))
      .catch((e) => toast.error(e?.message ?? 'Failed to load call logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matches = !q || `${log.customerName ?? ''}${log.customerPhone ?? ''}${log.operatorName ?? ''}`.toLowerCase().includes(q);
    const status = filterStatus === 'all' || log.status === filterStatus;
    return matches && status;
  });

  const completed = filtered.filter((c) => c.status === 'completed').length;
  const missed = filtered.filter((c) => c.status === 'missed').length;
  const avg = filtered.length ? Math.round(filtered.reduce((s, c) => s + (c.duration ?? 0), 0) / filtered.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Call Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed history of all customer calls</p>
        </div>
        <LogCallDialog onLogged={load} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', value: filtered.length, icon: Phone, color: '#00BDC3' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: '#10B981' },
          { label: 'Missed', value: missed, icon: XCircle, color: '#EF4444' },
          { label: 'Avg Duration', value: formatDuration(avg), icon: Clock, color: '#00BDC3' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-semibold mt-1" style={{ color: s.color }}>{s.value}</p></div>
                <s.icon className="w-8 h-8" style={{ color: s.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by customer, phone, or operator…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Call History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00BDC3]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Time', 'Customer', 'Phone', 'Operator', 'Status', 'Duration', 'Ride ID', 'Notes'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm text-foreground">{new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{log.customerName ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{log.customerPhone}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{log.operatorName}</td>
                      <td className="py-3 px-4"><Badge className={statusColor(log.status)}><span className="flex items-center gap-1">{statusIcon(log.status)}{log.status}</span></Badge></td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{formatDuration(log.duration ?? 0)}</td>
                      <td className="py-3 px-4 text-sm">{log.rideId ? <span className="font-mono text-[#00BDC3]">{String(log.rideId).slice(0, 8)}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{log.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12"><Phone className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No call logs found</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
