import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { api, type AuditLogRow } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Page, PageHeader, Surface } from '../components/layout/PageHeader';

function actionTone(action: string) {
  if (action.includes('lockout') || action.includes('revoke') || action.includes('transfer')) {
    return 'text-destructive';
  }
  if (action.includes('password') || action.includes('step_up') || action.includes('security')) {
    return 'text-[color:var(--warning)]';
  }
  if (action.includes('coupon') || action.includes('allocate')) {
    return 'text-primary';
  }
  return 'text-muted-foreground';
}

export default function AuditLog() {
  const { role, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (nextPage = page) => {
    setLoading(true);
    api.auditLogs
      .list({ action: action || undefined, resource: resource || undefined, page: nextPage, limit: 40 })
      .then((data) => {
        setLogs(data.logs ?? []);
        setPage(data.pagination?.page ?? 1);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      })
      .catch((e) => toast.error(e?.message ?? 'Failed to load audit log'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (role !== 'admin' && !isSuperAdmin) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Audit logs are visible to administrators.</div>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Immutable trail"
        title="Audit log"
        description="Every sensitive action already lands here, including coupon allocations and fare changes."
        actions={<p className="text-sm tabular-nums text-muted-foreground">{total.toLocaleString()} events</p>}
      />

      <Surface className="p-4">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              load(1);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Filter by action - auth.lockout, coupons.allocate…"
                className="h-11 pl-9"
              />
            </div>
            <Input
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="Resource - user, session, security"
              className="h-11 sm:w-56"
            />
            <Button type="submit" className="h-11">
              Search
            </Button>
          </form>
      </Surface>

      <Surface>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No events match those filters.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{log.user?.email ?? log.userId ?? 'system'}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${actionTone(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.resource}
                    {log.resourceId ? <span className="ml-1 font-mono text-xs text-muted-foreground">#{log.resourceId.slice(0, 8)}</span> : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>
    </Page>
  );
}
