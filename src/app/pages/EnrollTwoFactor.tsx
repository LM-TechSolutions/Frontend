import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function EnrollTwoFactor() {
  const navigate = useNavigate();
  const { user, completeTwoFactorEnrollment, logout, needsTwoFactorEnrollment } = useAuth();
  const [password, setPassword] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'password' | 'confirm'>('password');

  useEffect(() => {
    if (!needsTwoFactorEnrollment) navigate('/dashboard', { replace: true });
  }, [needsTwoFactorEnrollment, navigate]);

  const start = async () => {
    if (!password) {
      toast.error('Enter your password to continue');
      return;
    }
    setBusy(true);
    try {
      const res = await api.twoFactor.enable(password);
      setQrCodeDataUrl(res.qrCodeDataUrl);
      setTotpURI(res.totpURI);
      setBackupCodes(res.backupCodes ?? []);
      setStep('confirm');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start two-factor setup');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await api.twoFactor.verify(code);
      completeTwoFactorEnrollment();
      toast.success('Two-factor authentication is on. Welcome in.');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Invalid code — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#042f32_0%,#08656a_42%,#f8fafc_42%)] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BDC3] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Required to continue</p>
            <h1 className="text-2xl font-semibold">Turn on two-factor authentication</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Super Admin policy requires 2FA for {user?.name ?? 'this account'} before the dashboard opens. Scan once — trusted devices remember you for 30 days.
        </p>

        {step === 'password' ? (
          <div className="mt-8 space-y-4">
            <Input
              type="password"
              placeholder="Confirm your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
            <div className="flex gap-2">
              <Button className="flex-1 h-11 bg-[#00BDC3] text-white hover:bg-[#009EA3]" onClick={start} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start setup'}
              </Button>
              <Button variant="outline" className="h-11" onClick={() => { logout(); navigate('/', { replace: true }); }}>
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col sm:flex-row gap-5">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="Two-factor QR code" className="w-44 h-44 rounded-2xl border border-border bg-white p-2" />
              )}
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>1. Scan with Google Authenticator, Authy, or 1Password.</p>
                {totpURI && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[#00868C] hover:underline"
                    onClick={() => {
                      navigator.clipboard.writeText(totpURI);
                      toast.info('Setup link copied');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Can’t scan? Copy setup link
                  </button>
                )}
                <p>2. Enter the 6-digit code to finish.</p>
              </div>
            </div>
            {backupCodes.length > 0 && (
              <div className="rounded-2xl bg-muted p-4 text-xs">
                <p className="mb-2 font-semibold text-foreground">Backup codes — store these offline</p>
                <div className="grid grid-cols-2 gap-1 font-mono text-muted-foreground">
                  {backupCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-11 text-center tracking-[0.35em]"
              />
              <Button className="h-11 bg-[#00BDC3] text-white hover:bg-[#009EA3]" onClick={confirm} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable 2FA'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
