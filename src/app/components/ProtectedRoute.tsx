import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import IdleGuard from './security/IdleGuard';
import { StepUpHost } from './security/StepUpDialog';

export default function ProtectedRoute() {
  const { isAuthenticated, isReady, needsTwoFactorEnrollment } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-[#6B7280]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (needsTwoFactorEnrollment && location.pathname !== '/enroll-2fa') {
    return <Navigate to="/enroll-2fa" replace />;
  }

  return (
    <>
      <IdleGuard />
      <StepUpHost />
      <Outlet />
    </>
  );
}
