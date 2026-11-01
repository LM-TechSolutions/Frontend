import { useEffect, useState } from 'react';
import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router';
import { 
  ArrowLeft, 
  Home, 
  RefreshCw, 
  ShieldAlert, 
  FileQuestion, 
  LockKeyhole, 
  ServerCrash, 
  Clock, 
  AlertOctagon, 
  Layers 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ApiError } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';

const STATUS_KEYS = [400, 401, 403, 404, 408, 409, 410, 422, 429, 500, 501, 502, 503, 504] as const;

function bucket(status: number) {
  if ((STATUS_KEYS as readonly number[]).includes(status as any)) return status;
  if (status >= 500) return 500;
  if (status >= 400) return 400;
  return 500;
}

export function ErrorPage({
  status = 500,
  title,
  body,
}: {
  status?: number;
  title?: string;
  body?: string;
}) {
  const navigate = useNavigate();
  const { t } = useAppContext();
  const resolved = bucket(status);
  const family = resolved >= 500 ? t('errors.familyServer') : t('errors.familyRequest');

  // Auto-retry timer for transient server/network errors
  const isTransient = [408, 429, 502, 503, 504].includes(resolved);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(isTransient ? 15 : null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleManualRetry = () => {
    setIsRetrying(true);
    setRetryCountdown(null);
    window.location.reload();
  };

  // Status-specific visuals
  const visualConfig = {
    401: {
      Icon: LockKeyhole,
      gradient: 'from-amber-400 to-orange-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    },
    403: {
      Icon: ShieldAlert,
      gradient: 'from-rose-400 to-red-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      glow: 'shadow-[0_0_35px_rgba(244,63,94,0.25)]',
    },
    404: {
      Icon: FileQuestion,
      gradient: 'from-teal-400 via-cyan-400 to-blue-400',
      badgeBg: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      glow: 'shadow-[0_0_35px_rgba(20,184,166,0.25)]',
    },
    408: {
      Icon: Clock,
      gradient: 'from-amber-400 to-yellow-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    },
    429: {
      Icon: Clock,
      gradient: 'from-orange-400 to-amber-400',
      badgeBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      glow: 'shadow-[0_0_35px_rgba(249,115,22,0.25)]',
    },
    500: {
      Icon: ServerCrash,
      gradient: 'from-rose-400 via-pink-400 to-purple-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      glow: 'shadow-[0_0_35px_rgba(244,63,94,0.25)]',
    },
  }[resolved] ?? {
    Icon: resolved >= 500 ? ServerCrash : AlertOctagon,
    gradient: resolved >= 500 ? 'from-rose-400 to-orange-400' : 'from-teal-400 to-blue-400',
    badgeBg: resolved >= 500 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    glow: 'shadow-[0_0_35px_rgba(20,184,166,0.2)]',
  };

  const IconComponent = visualConfig.Icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Dynamic ambient radial gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,219,0.14),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(16,185,129,0.1),transparent_45%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-[130px]" />

      <div className="relative w-full max-w-lg my-auto">
        {/* Brand Pill Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-400 p-0.5 shadow-md">
              <img src="/logo.png" alt="Tokuma" className="h-full w-full object-contain rounded-lg" />
            </div>
            <div>
              <span className="font-display font-bold tracking-[0.2em] text-white text-xs">TOKUMA</span>
              <span className="mx-2 text-slate-600">·</span>
              <span className="text-[11px] font-mono text-teal-400 uppercase tracking-widest">{family} {status}</span>
            </div>
          </div>
        </div>

        {/* Elevated Error Card */}
        <div className="relative rounded-3xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-xl p-8 sm:p-10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] text-center">
          
          {/* Status Icon */}
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border ${visualConfig.badgeBg} ${visualConfig.glow}`}>
            <IconComponent className="h-10 w-10 animate-pulse" />
          </div>

          {/* Large Hero Status Number with Gradient */}
          <p className={`font-display text-7xl sm:text-8xl font-black tracking-tight bg-gradient-to-r ${visualConfig.gradient} bg-clip-text text-transparent select-none`}>
            {status}
          </p>

          {/* Error Title */}
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
            {title ?? t(`errors.${resolved}Title`)}
          </h1>

          {/* Friendly Description */}
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {body ?? t(`errors.${resolved}Body`)}
          </p>

          {/* Auto-retry Notification if transient error */}
          {retryCountdown !== null && retryCountdown > 0 && (
            <div className="mt-5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-teal-400 animate-spin" />
                Auto-retrying in <strong className="font-mono text-teal-300">{retryCountdown}s</strong>
              </span>
              <button
                type="button"
                onClick={() => setRetryCountdown(null)}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              className="h-11 px-5 border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('errors.back')}
            </Button>

            <Button
              variant="outline"
              className="h-11 px-5 border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
              onClick={handleManualRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {t('errors.retry')}
            </Button>

            {status === 401 ? (
              <Button
                asChild
                className="h-11 px-6 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl"
              >
                <Link to="/">
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  {t('errors.signIn')}
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="h-11 px-6 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl"
              >
                <Link to="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  {t('errors.dashboard')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RouteError() {
  const error = useRouteError();
  let status = 500;
  let body: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (typeof error.data === 'string' && error.data) body = error.data;
  } else if (error instanceof ApiError) {
    status = error.status;
    body = error.message;
  } else if (error instanceof Error && error.message) {
    body = error.message;
  }

  if (status === 401) {
    return <ErrorPage status={401} />;
  }

  return <ErrorPage status={status} body={status >= 500 ? undefined : body} />;
}
