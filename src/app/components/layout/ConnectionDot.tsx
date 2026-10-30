import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { connectSocket, getSocket } from '../../lib/socket';
import { cn } from '../ui/utils';
import { useAppContext } from '../../contexts/AppContext';

interface SocketStatusProps {
  className?: string;
  variant?: 'badge' | 'dot' | 'detailed';
  showLabel?: boolean;
}

/**
 * Real-time WebSocket connection badge.
 * Displays live connected / reconnecting / offline status with icon and latency.
 * Clicking when disconnected triggers an immediate reconnect.
 */
export function SocketStatusBadge({
  className,
  variant = 'badge',
  showLabel = true,
}: SocketStatusProps) {
  const { t } = useAppContext();
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'stale' | 'offline'>('offline');
  const [rtt, setRtt] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket() ?? connectSocket();
    let last = Date.now();

    const onConnect = () => {
      last = Date.now();
      setStatus('connected');
    };
    const onDisconnect = () => {
      setStatus('offline');
      setRtt(null);
    };
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onAnyEvent = () => {
      last = Date.now();
      setStatus((s) => (s === 'offline' || s === 'reconnecting' || s === 'stale' ? 'connected' : s));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.onAny(onAnyEvent);
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
    const interval = window.setInterval(() => {
      ping();
      if (!socket.connected) return;
      if (Date.now() - last > 45000) setStatus('stale');
    }, 8000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.offAny(onAnyEvent);
      window.clearInterval(interval);
    };
  }, []);

  const handleManualReconnect = () => {
    if (status === 'offline' || status === 'stale') {
      const socket = getSocket() ?? connectSocket();
      socket.connect();
      setStatus('reconnecting');
    }
  };

  if (variant === 'dot') {
    return (
      <span
        title={status === 'connected' ? `Socket Live (${rtt ?? 0}ms)` : `Socket ${status}`}
        className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', className)}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            status === 'connected'
              ? 'bg-emerald-500 animate-pulse'
              : status === 'reconnecting' || status === 'stale'
              ? 'bg-amber-500 animate-ping'
              : 'bg-rose-500'
          )}
        />
        {showLabel && (
          <span className="text-muted-foreground">
            {status === 'connected' ? t('common.live', 'Live') : status === 'reconnecting' ? 'Reconnecting…' : 'Offline'}
          </span>
        )}
      </span>
    );
  }

  // Full interactive badge
  if (status === 'connected') {
    return (
      <div
        title={`WebSocket connected to server telemetry (${rtt != null ? `${rtt}ms` : 'active'})`}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium select-none',
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs transition-all',
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Wifi className="h-3 w-3 text-emerald-500 shrink-0" />
        {showLabel && <span className="font-semibold">{t('common.live', 'Live')}</span>}
        {rtt != null && (
          <span className="font-mono text-[10px] opacity-80 tabular-nums">
            {rtt}ms
          </span>
        )}
      </div>
    );
  }

  if (status === 'reconnecting' || status === 'stale') {
    return (
      <div
        title="Reconnecting to real-time socket server…"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium select-none',
          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs animate-pulse',
          className
        )}
      >
        <RefreshCw className="h-3 w-3 animate-spin text-amber-500 shrink-0" />
        {showLabel && <span>{t('common.reconnecting', 'Reconnecting…')}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleManualReconnect}
      title="WebSocket disconnected. Click to reconnect now."
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium select-none cursor-pointer',
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-xs hover:bg-rose-500/20 active:scale-95 transition-all',
        className
      )}
    >
      <WifiOff className="h-3 w-3 text-rose-500 shrink-0" />
      {showLabel && <span>{t('common.offline', 'Socket Disconnected')}</span>}
    </button>
  );
}

/** Legacy alias for backwards compatibility */
export const ConnectionDot = SocketStatusBadge;
