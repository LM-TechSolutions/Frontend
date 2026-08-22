import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket, subscribeMap, unsubscribeMap } from '../lib/socket';

/**
 * Seed from REST once, then apply socket events to local state.
 * A sequence gap or a reconnect triggers one reconciliation fetch - the
 * thing polling used to paper over.
 */
export function useRealtimeCollection<T>(options: {
  load: () => Promise<T>;
  events: string[];
  apply?: (prev: T, event: string, payload: any) => T;
  subscribeMap?: boolean;
  enabled?: boolean;
  refetchEvents?: string[];
}) {
  const { load, events, apply, subscribeMap: wantMap = false, enabled = true, refetchEvents = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const seqRef = useRef<number | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const reload = useCallback(async () => {
    try {
      const next = await loadRef.current();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
    const socket = getSocket() ?? connectSocket();
    if (wantMap) subscribeMap();

    const onEvent = (event: string) => (payload: any) => {
      const seq = typeof payload?.seq === 'number' ? payload.seq : null;
      if (seq != null && seqRef.current != null && seq > seqRef.current + 1) {
        void reload();
      }
      if (seq != null) seqRef.current = Math.max(seqRef.current ?? 0, seq);

      if (refetchEvents.includes(event)) {
        void reload();
        return;
      }

      if (applyRef.current) {
        setData((prev) => (prev == null ? prev : applyRef.current!(prev, event, payload)));
      } else {
        void reload();
      }
    };

    const handlers = events.map((ev) => {
      const fn = onEvent(ev);
      socket.on(ev, fn);
      return { ev, fn };
    });

    const onReconnect = () => void reload();
    socket.io.on('reconnect', onReconnect);

    return () => {
      handlers.forEach(({ ev, fn }) => socket.off(ev, fn));
      socket.io.off('reconnect', onReconnect);
      if (wantMap) unsubscribeMap();
    };
  }, [enabled, events.join('|'), reload, wantMap]);

  return { data, setData, loading, reload };
}
