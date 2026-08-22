import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router';
import { ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ApiError } from '../lib/api';

const COPY: Record<number, { title: string; body: string }> = {
  400: { title: 'That request is not valid', body: 'Something in the request was missing or malformed. Go back and try again.' },
  401: { title: 'You need to sign in', body: 'This page is only available after you sign in.' },
  403: { title: 'You do not have access', body: 'This account cannot open that page. Ask an administrator if you need it.' },
  404: { title: 'Page not found', body: 'That URL is not in TEKUMMA. Check the link, or go back to the desk.' },
  408: { title: 'The request timed out', body: 'The server took too long to answer. Try again in a moment.' },
  409: { title: 'That change conflicted', body: 'Someone else updated this at the same time. Refresh and retry.' },
  410: { title: 'This is gone', body: 'The resource was removed and is not coming back.' },
  422: { title: 'We could not save that', body: 'A field did not pass validation. Check the form and try again.' },
  429: { title: 'Too many requests', body: 'Slow down for a minute, then retry.' },
  500: { title: 'Something broke on our side', body: 'The desk hit an unexpected error. Retry, or come back shortly.' },
  501: { title: 'Not supported yet', body: 'This action is not available on the server.' },
  502: { title: 'Upstream failed', body: 'A connected service did not respond. Try again in a moment.' },
  503: { title: 'Temporarily unavailable', body: 'TEKUMMA is down for maintenance or overload. Try again shortly.' },
  504: { title: 'The gateway timed out', body: 'A connected service took too long. Retry in a moment.' },
};

function bucket(status: number) {
  if (COPY[status]) return status;
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
  const resolved = bucket(status);
  const copy = COPY[resolved];
  const family = resolved >= 500 ? 'Server' : 'Request';

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#042f32] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,212,219,0.35),transparent_42%),radial-gradient(circle_at_88%_88%,rgba(224,138,20,0.18),transparent_40%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {family} · {status}
        </p>
        <p className="mt-3 font-display text-7xl font-semibold tabular-nums text-[#042f32]">{status}</p>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{title ?? copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body ?? copy.body}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
          {status === 401 ? (
            <Button asChild>
              <Link to="/">Sign in</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/dashboard">
                <Home className="mr-2 h-4 w-4" /> Dashboard
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
