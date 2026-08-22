import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { api } from '../../lib/api';
import { useAppContext } from '../../contexts/AppContext';

const CHANNELS = ['in_app', 'email', 'sms', 'push'] as const;
const PREF_TYPES: Array<{ type: string; labelKey: string }> = [
  { type: '*', labelKey: 'settings.prefDefault' },
  { type: 'ride_no_drivers', labelKey: 'settings.prefNoDrivers' },
  { type: 'coupon_request_raised', labelKey: 'settings.prefCouponRequest' },
  { type: 'coupon_low', labelKey: 'settings.prefCouponLow' },
  { type: 'driver_suspended', labelKey: 'settings.prefDriverSuspended' },
  { type: 'settings_changed', labelKey: 'settings.prefSettingsChanged' },
  { type: 'suspicious_login', labelKey: 'settings.prefLogin' },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function channelOn(
  rows: Array<{ type: string; channel: string; enabled: boolean }>,
  type: string,
  channel: string
) {
  const specific = rows.find((r) => r.type === type && r.channel === channel);
  if (specific) return specific.enabled;
  const star = rows.find((r) => r.type === '*' && r.channel === channel);
  if (star) return star.enabled;
  return true;
}

export function NotificationPrefsCard() {
  const { t } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [quietOn, setQuietOn] = useState(false);
  const [digest, setDigest] = useState('none');
  const [channels, setChannels] = useState<Array<{ type: string; channel: string; enabled: boolean }>>([]);
  const [vapid, setVapid] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    api.notifications
      .preferences()
      .then((prefs) => {
        setQuietOn(Boolean(prefs.quietHoursStart && prefs.quietHoursEnd));
        setQuietStart(prefs.quietHoursStart ?? '22:00');
        setQuietEnd(prefs.quietHoursEnd ?? '07:00');
        setDigest(prefs.digest ?? 'none');
        setChannels(prefs.channels ?? []);
        setVapid(prefs.vapidPublicKey);
      })
      .catch((e: any) => toast.error(e?.message ?? 'Could not load notification preferences'))
      .finally(() => setLoading(false));

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushOn(Boolean(sub)))
        .catch(() => undefined);
    }
  }, []);

  const channelLabel = useMemo(
    () => ({
      in_app: t('settings.channelInApp', 'In-app'),
      email: t('settings.channelEmail', 'Email'),
      sms: t('settings.channelSms', 'SMS'),
      push: t('settings.channelPush', 'Push'),
    }),
    [t]
  );

  const save = async (next?: {
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    digest?: string;
    channels?: Array<{ type: string; channel: string; enabled: boolean }>;
  }) => {
    setSaving(true);
    try {
      const body = {
        quietHoursStart: quietOn ? quietStart : null,
        quietHoursEnd: quietOn ? quietEnd : null,
        digest,
        channels,
        ...next,
      };
      await api.notifications.updatePreferences(body);
      toast.success(t('settings.prefsSaved', 'Notification preferences saved'));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (type: string, channel: string, enabled: boolean) => {
    setChannels((prev) => {
      const rest = prev.filter((r) => !(r.type === type && r.channel === channel));
      const next = [...rest, { type, channel, enabled }];
      void save({ channels: next });
      return next;
    });
  };

  const enablePush = async () => {
    if (!vapid) {
      toast.error(t('settings.pushUnavailable', 'Web push is not configured on the server (missing VAPID keys).'));
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error(t('settings.pushDenied', 'Notifications are blocked in this browser.'));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error(t('settings.pushDenied', 'Notifications are blocked in this browser.'));
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      await api.notifications.subscribePush(sub.toJSON());
      setPushOn(true);
      toast.success(t('settings.pushEnabled', 'This browser will alert you to unassigned rides with the tab in the background.'));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not enable web push');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> {t('settings.notificationSettings', 'Notifications')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('settings.quietHours', 'Quiet hours')}</p>
            <p className="text-xs text-muted-foreground">
              {t('settings.quietHoursHint', 'Inbox still fills. Email, SMS, and push pause until morning.')}
            </p>
          </div>
          <Switch
            checked={quietOn}
            onCheckedChange={(on) => {
              setQuietOn(on);
              void save({
                quietHoursStart: on ? quietStart : null,
                quietHoursEnd: on ? quietEnd : null,
              });
            }}
          />
        </div>
        {quietOn ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('settings.quietFrom', 'From')}</Label>
              <Input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                onBlur={() => void save({ quietHoursStart: quietStart, quietHoursEnd: quietEnd })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.quietTo', 'To')}</Label>
              <Input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                onBlur={() => void save({ quietHoursStart: quietStart, quietHoursEnd: quietEnd })}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>{t('settings.digest', 'Email digest')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('settings.digestHint', 'Bundle email into a summary instead of sending each alert immediately.')}
          </p>
          <Select
            value={digest}
            onValueChange={(value) => {
              setDigest(value);
              void save({ digest: value });
            }}
          >
            <SelectTrigger className="h-10 w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('settings.digestNone', 'Send immediately')}</SelectItem>
              <SelectItem value="daily">{t('settings.digestDaily', 'Daily summary')}</SelectItem>
              <SelectItem value="weekly">{t('settings.digestWeekly', 'Weekly summary')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.enablePush', 'Enable web push')}</p>
          {pushOn ? (
            <p className="text-sm text-muted-foreground">
              {t('settings.pushEnabled', 'This browser will alert you to unassigned rides with the tab in the background.')}
            </p>
          ) : (
            <Button type="button" variant="outline" onClick={() => void enablePush()} disabled={!vapid}>
              {t('settings.enablePush', 'Enable web push')}
            </Button>
          )}
          {!vapid ? (
            <p className="text-xs text-muted-foreground">
              {t('settings.pushUnavailable', 'Web push is not configured on the server (missing VAPID keys).')}
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium"> </th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="px-2 py-2 font-medium">
                    {channelLabel[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PREF_TYPES.map((row) => (
                <tr key={row.type} className="border-t border-border">
                  <td className="py-2 pr-3">{t(row.labelKey, row.type)}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch} className="px-2 py-2">
                      <Switch
                        checked={channelOn(channels, row.type, ch)}
                        onCheckedChange={(on) => toggleChannel(row.type, ch, on)}
                        disabled={saving}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
