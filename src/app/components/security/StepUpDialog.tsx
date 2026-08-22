import { useCallback, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { api, ApiError } from '../../lib/api';

const ACTION_COPY: Record<string, { title: string; body: string }> = {
  coupon_allocate: {
    title: 'Confirm coupon allocation',
    body: 'Allocating coupons moves real inventory. Re-enter your password to continue.',
  },
  super_admin_transfer: {
    title: 'Confirm Super Admin transfer',
    body: 'This hands unrestricted access to another account. Re-enter your password to continue.',
  },
  fare_change: {
    title: 'Confirm fare change',
    body: 'Fare rules affect every live trip. Re-enter your password to save.',
  },
};

export async function withStepUp<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError && error.code === 'STEP_UP_REQUIRED') {
      const confirmed = await requestStepUp(action);
      if (!confirmed) throw error;
      return await fn();
    }
    throw error;
  }
}

type Resolver = (ok: boolean) => void;

let pending: { action: string; resolve: Resolver } | null = null;
let notify: ((action: string | null) => void) | null = null;

function requestStepUp(action: string): Promise<boolean> {
  return new Promise((resolve) => {
    pending = { action, resolve };
    notify?.(action);
  });
}

export function StepUpHost() {
  const [action, setAction] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  notify = setAction;

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    pending = null;
    setAction(null);
    setPassword('');
    setError(null);
    setBusy(false);
  };

  const submit = async () => {
    if (!action || !password) {
      setError('Enter your password');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.stepUp(password, action);
      close(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not confirm your identity');
      setBusy(false);
    }
  };

  const copy = ACTION_COPY[action ?? ''] ?? {
    title: 'Confirm it’s you',
    body: 'Re-enter your password to continue this action.',
  };

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="sm:max-w-[420px] overflow-hidden border-0 bg-card p-0 shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-sidebar via-primary to-[var(--primary-hover)]" />
        <div className="p-6">
          <DialogHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">{copy.title}</DialogTitle>
            <DialogDescription>{copy.body}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-2">
            <Label htmlFor="step-up-password">Password</Label>
            <Input
              id="step-up-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="h-11"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => close(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useStepUp() {
  return useCallback(<T,>(action: string, fn: () => Promise<T>) => withStepUp(action, fn), []);
}
