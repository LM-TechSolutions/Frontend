import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { api, ApiError } from '../lib/api';

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady, needsTwoFactorEnrollment } = useAuth();
  const { t } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    navigate(needsTwoFactorEnrollment ? '/enroll-2fa' : '/dashboard', { replace: true });
  }, [isReady, isAuthenticated, needsTwoFactorEnrollment, navigate]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  const locked = lockSeconds > 0;
  const lockProgress = useMemo(() => Math.min(100, (lockSeconds / 900) * 100), [lockSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (!email || !password) {
      toast.error(t('auth.fillAll'));
      return;
    }
    if (needsCode && !code) {
      toast.error(t('auth.enterCode'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password, needsCode ? code : undefined, { rememberDevice });
      if (result.twoFactorRequired) {
        setNeedsCode(true);
        if (!code) toast.info(t('auth.enterCode'));
        else toast.error(t('auth.invalidCode'));
        return;
      }
      toast.success(`${t('auth.loginSuccessful')} ${result.user.name}`);
      navigate(result.twoFactorEnrollmentRequired ? '/enroll-2fa' : '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') {
        const remaining = Number(err.details?.remainingSeconds ?? 15 * 60);
        setLockSeconds(remaining);
        toast.error(err.message);
        return;
      }
      const message = err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReset = async () => {
    const target = (forgotEmail || email).trim();
    if (!target) {
      toast.error('Enter the email on your staff account');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.forgotPassword(target);
      setForgotSent(true);
      toast.success('If that account exists, a reset link is on its way.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <aside className="relative hidden overflow-hidden lg:flex flex-col justify-between p-12 text-white bg-[#042f32]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,189,195,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(0,134,140,0.45),transparent_40%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BDC3] text-xl font-bold shadow-[0_0_40px_rgba(0,189,195,0.45)]">
              T
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[0.28em]">TEKUMMA</p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Dispatch command</p>
            </div>
          </div>
        </div>
        <div className="relative max-w-lg space-y-6">
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Command the city.
            <span className="block text-[#7ee8ec]">Protect every session.</span>
          </p>
          <p className="text-sm leading-6 text-white/70">
            Staff sign-in now carries lockout, trusted devices, and an audit trail — the same bar as the money moving through coupons and fares.
          </p>
          <div className="flex flex-wrap gap-2">
            {['15-minute lockout', 'Remember this device', 'Step-up for fares'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-white/80 backdrop-blur"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/45">Addis Ababa · live operations</p>
      </aside>

      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,189,195,0.08),transparent_32%)]" />
        <div className="relative w-full max-w-[440px]">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00BDC3] text-white font-bold">T</div>
            <span className="text-xl font-semibold tracking-tight">TEKUMMA</span>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/90 p-8 shadow-[0_24px_80px_-32px_rgba(0,134,140,0.45)] backdrop-blur">
            {locked ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Account locked</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Too many failed attempts. This terminal will unlock automatically.
                  </p>
                </div>
                <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-[#00BDC3]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${lockProgress}, 100`}
                    />
                  </svg>
                  <span className="font-mono text-lg font-semibold">{formatCountdown(lockSeconds)}</span>
                </div>
              </div>
            ) : forgotOpen ? (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-semibold">Reset your password</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We’ll email a link to the staff account. The current password stays valid until you finish.
                  </p>
                </div>
                {forgotSent ? (
                  <div className="rounded-2xl border border-[#00BDC3]/20 bg-[#00BDC3]/8 p-4 text-sm">
                    Check your inbox. The link expires in 30 minutes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Work email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={forgotEmail || email}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-11"
                      placeholder="you@tokuma.et"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {!forgotSent && (
                    <Button className="flex-1 h-11 bg-[#00BDC3] text-white hover:bg-[#009EA3]" onClick={sendReset} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
                    </Button>
                  )}
                  <Button variant="outline" className="h-11" onClick={() => { setForgotOpen(false); setForgotSent(false); }}>
                    Back to sign in
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#00BDC3]/10 px-3 py-1 text-xs font-medium text-[#00868C]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Staff access
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">{needsCode ? 'Verify it’s you' : t('auth.welcome')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {needsCode ? t('auth.twoFactorPrompt') : t('auth.description')}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {!needsCode ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('auth.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@tokuma.et"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11"
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">{t('auth.password')}</Label>
                          <button type="button" className="text-xs text-[#00868C] hover:underline" onClick={() => setForgotOpen(true)}>
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 pr-10"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                        <Checkbox checked={rememberDevice} onCheckedChange={(v) => setRememberDevice(v === true)} className="mt-0.5" />
                        <span>
                          <span className="font-medium">Remember this device for 30 days</span>
                          <span className="block text-xs text-muted-foreground">
                            Trusted terminals skip the authenticator prompt — the reason 2FA stays on.
                          </span>
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="code" className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#00BDC3]" /> {t('auth.code')}
                      </Label>
                      <Input
                        id="code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="h-12 text-center text-lg tracking-[0.4em]"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => {
                          setNeedsCode(false);
                          setCode('');
                        }}
                      >
                        {t('auth.backToSignIn')}
                      </button>
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11 bg-[#00BDC3] hover:bg-[#009EA3] text-white" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {needsCode ? t('auth.verifying') : t('auth.loggingIn')}
                      </span>
                    ) : needsCode ? (
                      t('auth.verify')
                    ) : (
                      t('auth.login')
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need a new password from a reset email?{' '}
            <Link to="/reset-password" className="text-[#00868C] hover:underline">
              Open reset
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
