import { useEffect, useState } from 'react';
import { connectSocket, getSocket } from '../../lib/socket';
import { cn } from '../ui/utils';
import { useAppContext } from '../../contexts/AppContext';

export function ConnectionDot() {
  const { t } = useAppContext();
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'stale' | 'offline'>('offline');
  const [rtt, setRtt] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    let last = Date.now();
    const on = () => {
      last = Date.now();
      setStatus('connected');
    };
    const off = () => {
      setStatus('offline');
      setRtt(null);
    };
    const recon = () => setStatus('reconnecting');
    const any = () => {
      last = Date.now();
      setStatus((s) => (s === 'offline' || s === 'reconnecting' || s === 'stale' ? 'connected' : s));
    };
    socket.on('connect', on);
    socket.on('disconnect', off);
    socket.on('reconnect_attempt', recon);
    socket.onAny(any);
    if (socket.connected) setStatus('connected');

    const ping = () => {
      if (!socket.connected) return;
      const t0 = Date.now();
      socket.timeout(4000).emit('heartbeat', t0, (err: Error | null, echoed?: number) => {
        if (err) return;
        last = Date.now();
        setRtt(Date.now() - (typeof echoed === 'number' ? echoed : t0));
      });
    };
    ping();
    const tick = window.setInterval(() => {
      ping();
      if (!socket.connected) return;
      if (Date.now() - last > 45000) setStatus('stale');
    }, 8000);

    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
      socket.off('reconnect_attempt', recon);
      socket.offAny(any);
      window.clearInterval(tick);
    };
  }, []);

  const copy =
    status === 'connected'
      ? t('common.live', 'Live')
      : status === 'reconnecting'
        ? t('common.reconnecting', 'Reconnecting')
        : status === 'stale'
          ? t('common.stale', 'Stale')
          : t('common.offline', 'Offline');

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'connected'
            ? 'animate-pulse bg-[color:var(--success)]'
            : status === 'reconnecting' || status === 'stale'
              ? 'bg-[color:var(--warning)]'
              : 'bg-destructive'
        )}
      />
      {copy}
      {status === 'connected' && rtt != null ? <span className="font-mono opacity-70">{rtt}ms</span> : null}
    </span>
  );
}
