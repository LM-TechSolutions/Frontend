import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, type Language } from '../contexts/AppContext';
import { api, ApiError } from '../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady, needsTwoFactorEnrollment } = useAuth();
  const { t, language, setLanguage } = useAppContext();
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
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:flex flex-col justify-between p-12 text-white bg-[#042f32]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,212,219,0.45),transparent_42%),radial-gradient(circle_at_88%_88%,rgba(224,138,20,0.22),transparent_40%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00d4db] text-xl font-bold text-[#042f32] shadow-[0_0_40px_rgba(0,212,219,0.45)]">
              T
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-[0.22em]">TEKUMMA</p>
            </div>
          </div>
        </div>
        <div className="relative max-w-lg space-y-5">
          <p className="font-display text-4xl font-semibold leading-tight tracking-tight">
            The floor stays live.
            <span className="mt-2 block text-[#7ee8ec]">Every ride. Every wallet.</span>
          </p>
        </div>
        <p className="relative text-xs text-white/45">Operations desk</p>
      </aside>

      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-6 top-6">
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="h-9 w-[132px] rounded-full bg-card">
              <SelectValue placeholder={t('common.language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="am">አማርኛ</SelectItem>
              <SelectItem value="om">Oromiffa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground">T</div>
            <span className="font-display text-xl font-semibold tracking-tight">TEKUMMA</span>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/90 p-8 shadow-[0_24px_80px_-32px_rgba(5,50,54,0.45)]">
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
                      className="text-primary"
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
                  <p className="mt-1 text-sm text-muted-foreground">We’ll email a reset link.</p>
                </div>
                {forgotSent ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm">
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
                    <Button className="flex-1 h-11" onClick={sendReset} disabled={isLoading}>
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
                  <h1 className="font-display text-2xl font-semibold tracking-tight">{needsCode ? 'Verify it’s you' : t('auth.welcome')}</h1>
                  {needsCode ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">{t('auth.twoFactorPrompt')}</p>
                  ) : null}
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
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgotOpen(true)}>
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
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                        <Checkbox checked={rememberDevice} onCheckedChange={(v) => setRememberDevice(v === true)} />
                        <span className="font-medium">Remember this device for 30 days</span>
                      </label>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="code" className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" /> {t('auth.code')}
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
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
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
        </div>
      </main>
    </div>
  );
}
