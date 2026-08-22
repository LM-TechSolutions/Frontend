import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';

const WARN_AT_MS = 60_000;

export default function IdleGuard() {
  const { idleTimeoutMinutes, isAuthenticated, logout } = useAuth();
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
          toast.warning('Still there?', {
            description: 'This terminal will sign out in 1 minute to protect the account.',
          });
        }, limit - WARN_AT_MS);
      }
      timer = setTimeout(() => {
        logout();
        toast.message('Signed out after inactivity');
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
  }, [idleTimeoutMinutes, isAuthenticated, logout, navigate]);

  return null;
}
