import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Inbox, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { api, type InboxNotification } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { formatDateTime } from '../lib/format';
import { Page, PageHeader, FilterBar, Surface } from '../components/layout/PageHeader';
import { EmptyState } from '../components/coupons/CouponAtoms';
import { useAppContext } from '../contexts/AppContext';

export default function Notifications() {
  const navigate = useNavigate();
  const { t } = useAppContext();
  const groups = useMemo(
    () => [
      { id: 'all', label: t('inbox.groupAll', 'All'), match: () => true },
      { id: 'rides', label: t('inbox.groupRides', 'Rides'), match: (tp: string) => tp.startsWith('ride') },
      { id: 'coupons', label: t('inbox.groupCoupons', 'Coupons'), match: (tp: string) => tp.startsWith('coupon') },
      { id: 'drivers', label: t('inbox.groupDrivers', 'Drivers'), match: (tp: string) => tp.startsWith('driver') },
      {
        id: 'security',
        label: t('inbox.groupSecurity', 'Security'),
        match: (tp: string) =>
          ['suspicious_login', 'session_change', 'device_change', '2fa_enabled', '2fa_disabled', 'password_reset'].includes(tp),
      },
      {
        id: 'system',
        label: t('inbox.groupSystem', 'System'),
        match: (tp: string) => tp === 'system_alert' || tp === 'settings_changed',
      },
    ],
    [t]
  );
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    try {
      const res = await api.notifications.list({ limit: 50, unreadOnly: unreadOnly || undefined });
      setItems(res.notifications ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [unreadOnly]);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    const onNew = (payload: any) => {
      const row: InboxNotification = {
        id: payload.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
        isRead: false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };
      setItems((prev) => [row, ...prev.filter((n) => n.id !== row.id)]);
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, []);

  const visible = useMemo(() => {
    const g = groups.find((x) => x.id === group) ?? groups[0];
    return items.filter((n) => g.match(n.type));
  }, [items, group, groups]);

  const markRead = async (n: InboxNotification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      await api.notifications.markRead(n.id).catch(() => undefined);
    }
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <Page>
      <PageHeader
        eyebrow={t('inbox.eyebrow', 'Inbox')}
        title={t('inbox.title', 'Notifications')}
        actions={
          <Button variant="outline" onClick={() => api.notifications.markAllRead().then(load)}>
            <Check className="mr-2 h-4 w-4" /> {t('inbox.markAllRead', 'Mark all read')}
          </Button>
        }
      />
      <FilterBar>
        {groups.map((g) => (
          <Button key={g.id} size="sm" variant={group === g.id ? 'default' : 'outline'} onClick={() => setGroup(g.id)}>
            {g.label}
          </Button>
        ))}
        <Button size="sm" variant={unreadOnly ? 'default' : 'outline'} onClick={() => setUnreadOnly((v) => !v)}>
          {t('inbox.unreadOnly', 'Unread only')}
        </Button>
      </FilterBar>
      <Surface>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Inbox} title={t('inbox.empty', 'Inbox is clear')} />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-4 ${n.isRead ? '' : 'bg-primary/5'}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => void markRead(n)}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setItems((prev) => prev.filter((x) => x.id !== n.id));
                    void api.notifications.remove(n.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </Page>
  );
}
