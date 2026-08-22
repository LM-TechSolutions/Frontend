import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) navigate('/', { replace: true });
  }, [token, navigate]);

  const strength = useMemo(() => {
    if (password.length >= 12) return 'Strong passphrase';
    if (password.length >= 8) return 'Meets the 8-character minimum';
    return 'At least 8 characters';
  }, [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('This reset link is missing its token.');
      return;
    }
    if (password.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password, confirm);
      toast.success('Password updated. Sign in with the new one.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#042f32] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,189,195,0.28),transparent_40%)]" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow((v) => !v)}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{strength}</p>
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy || !token}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </Button>
          <Link to="/" className="block text-center text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
