import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { useAppContext } from '../../contexts/AppContext';

const WARN_AT_MS = 60_000;

export default function IdleGuard() {
  const { idleTimeoutMinutes, isAuthenticated, logout } = useAuth();
  const { t } = useAppContext();
  const navigate = useNavigate();
  const warned = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || idleTimeoutMinutes <= 0) return;

    const limit = idleTimeoutMinutes * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    let warnTimer: ReturnType<typeof setTimeout>;

    const arm = () => {
      clearTimeout(timer);
      clearTimeout(warnTimer);
      warned.current = false;
      if (limit > WARN_AT_MS) {
        warnTimer = setTimeout(() => {
          warned.current = true;
          toast.warning(t('auth.stillThere'), {
            description: t('auth.stillThereBody'),
          });
        }, limit - WARN_AT_MS);
      }
      timer = setTimeout(() => {
        logout();
        toast.message(t('auth.signedOutIdle'));
        navigate('/', { replace: true });
      }, limit);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }));
    arm();

    return () => {
      clearTimeout(timer);
      clearTimeout(warnTimer);
      events.forEach((event) => window.removeEventListener(event, arm));
    };
  }, [idleTimeoutMinutes, isAuthenticated, logout, navigate, t]);

  return null;
}
