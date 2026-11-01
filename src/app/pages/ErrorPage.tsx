import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router';
import { ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ApiError } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';

const STATUS_KEYS = [400, 401, 403, 404, 408, 409, 410, 422, 429, 500, 501, 502, 503, 504] as const;

function bucket(status: number) {
  if ((STATUS_KEYS as readonly number[]).includes(status)) return status;
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

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#042f32] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,212,219,0.35),transparent_42%),radial-gradient(circle_at_88%_88%,rgba(224,138,20,0.18),transparent_40%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {family} · {status}
        </p>
        <p className="mt-3 font-display text-7xl font-semibold tabular-nums text-[#042f32]">{status}</p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          {title ?? t(`errors.${resolved}Title`)}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {body ?? t(`errors.${resolved}Body`)}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('errors.back')}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t('errors.retry')}
          </Button>
          {status === 401 ? (
            <Button asChild>
              <Link to="/">{t('errors.signIn')}</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/dashboard">
                <Home className="mr-2 h-4 w-4" /> {t('errors.dashboard')}
              </Link>
            </Button>
          )}
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
