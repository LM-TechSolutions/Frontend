import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Shield, 
  Activity, 
  Globe2 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from '../components/ui/input-otp';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext, type Language } from '../contexts/AppContext';
import { api, ApiError } from '../lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TimedAlert } from '../components/auth/TimedAlert';

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady, needsTwoFactorEnrollment } = useAuth();
  const { t, language, setLanguage } = useAppContext();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Forgot password & confirmation states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Processing & timed error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    navigate(needsTwoFactorEnrollment ? '/enroll-2fa' : '/dashboard', { replace: true });
  }, [isReady, isAuthenticated, needsTwoFactorEnrollment, navigate]);

  // Account lock countdown
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  // Forgot password resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const locked = lockSeconds > 0;
  const lockProgress = useMemo(() => Math.min(100, (lockSeconds / 900) * 100), [lockSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    // Reset previous error
    setErrorMessage(null);

    if (!email.trim() || !password) {
      const msg = t('auth.fillAll');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    if (needsCode && code.trim().length !== 6) {
      const msg = t('auth.enterCode');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password, needsCode ? code.trim() : undefined, { rememberDevice });
      if (result.twoFactorRequired) {
        setNeedsCode(true);
        if (!code) {
          toast.info(t('auth.enterCode'));
        } else {
          const invalidMsg = t('auth.invalidCode');
          setErrorMessage(invalidMsg);
          toast.error(invalidMsg);
        }
        return;
      }
      toast.success(`${t('auth.loginSuccessful')} ${result.user.name}`);
      navigate(result.twoFactorEnrollmentRequired ? '/enroll-2fa' : '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') {
        const remaining = Number(err.details?.remainingSeconds ?? 15 * 60);
        setLockSeconds(remaining);
        setErrorMessage(err.message);
        toast.error(err.message);
        return;
      }
      const message = err instanceof ApiError ? err.message : t('auth.signInFailed');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReset = async (isResend = false) => {
    const target = (forgotEmail || email).trim();
    if (!target) {
      const msg = t('auth.enterStaffEmail');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.auth.forgotPassword(target);
      setForgotSent(true);
      setResendCooldown(60);
      toast.success(isResend ? t('auth.resetLinkDispatched') + ` ${target}` : t('auth.resetEmailSent'));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('auth.resetEmailFailed');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Brand & Showcase Side (Desktop) */}
      <aside className="relative hidden overflow-hidden lg:flex flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#021f21] via-[#042d30] to-[#02181a] border-r border-teal-500/10">
        {/* Glowing atmospheric mesh effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,212,219,0.22),transparent_48%),radial-gradient(circle_at_85%_75%,rgba(16,185,129,0.18),transparent_45%)]" />
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px]" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-black/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-400 p-0.5 shadow-[0_0_24px_rgba(0,212,219,0.4)]">
              <img src="/logo.png" alt="Tokuma Logo" className="h-full w-full object-contain rounded-lg" onError={(e) => {
                // Fallback icon if logo image is unavailable
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-[0.24em] text-white">TOKUMA</p>
              <p className="text-[10px] font-medium tracking-widest text-teal-300/80 uppercase">Technologies & Mobility</p>
            </div>
          </div>
        </div>

        {/* Hero Narrative */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            {t('auth.systemOnline')}
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.15] tracking-tight text-white">
            {t('auth.floorLive')}
            <span className="mt-2 block bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-100 bg-clip-text text-transparent">
              {t('auth.floorLiveAccent')}
            </span>
          </h1>

          <p className="text-sm xl:text-base text-slate-300/80 leading-relaxed">
            High-concurrency dispatch telemetry, automated street hail authorization, real-time driver fleet allocations, and immutable ledger balance accounting.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <Shield className="h-5 w-5 text-teal-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Two-Factor Protected</p>
                <p className="text-slate-400 text-[11px]">Hardware & TOTP Auth</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <Activity className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Live Telemetry Sync</p>
                <p className="text-slate-400 text-[11px]">Sub-second Fleet State</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400/60 pt-4 border-t border-white/5">
          <p>{t('auth.dispatchOperations')}</p>
          <p>Addis Ababa, Ethiopia</p>
        </div>
      </aside>

      {/* Main Interactive Form Side */}
      <main className="relative flex flex-col justify-center items-center p-6 sm:p-12 lg:p-14 bg-slate-950 overflow-y-auto">
        {/* Ambient background glow behind form */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(13,148,136,0.12),transparent_60%)]" />

        {/* Top bar with language switcher */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            <Globe2 className="h-3.5 w-3.5 text-teal-400" />
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="h-7 w-[120px] border-none bg-transparent shadow-none px-1 text-xs text-slate-200 focus:ring-0">
                <SelectValue placeholder={t('common.language')} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="en">English (US)</SelectItem>
                <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                <SelectItem value="om">Afaan Oromoo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative w-full max-w-[450px] my-auto">
          {/* Mobile Brand Logo Header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20">
              <img src="/logo.png" alt="Tokuma" className="h-full w-full object-contain rounded-xl" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white">TOKUMA</span>
              <p className="text-[10px] tracking-widest text-teal-400 uppercase">{t('auth.dispatchOperations')}</p>
            </div>
          </div>

          {/* Elevated Auth Card Container */}
          <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl p-7 sm:p-9 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)]">
            
            {/* Timed Error Message Banner with drain progress bar */}
            {errorMessage && (
              <div className="mb-6">
                <TimedAlert
                  message={errorMessage}
                  durationMs={6000}
                  variant="error"
                  onDismiss={() => setErrorMessage(null)}
                />
              </div>
            )}

            {/* SCENARIO 1: Account Locked Screen */}
            {locked ? (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                  <Lock className="h-9 w-9 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{t('auth.accountLocked')}</h2>
                  <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {t('auth.accountLockedBody')}
                  </p>
                </div>
                
                {/* SVG Countdown Ring */}
                <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90 h-full w-full" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                    />
                    <path
                      className="text-teal-400 transition-all duration-1000 ease-linear"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeDasharray={`${lockProgress}, 100`}
                    />
                  </svg>
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-white tracking-wider">
                      {formatCountdown(lockSeconds)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Lockout</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">Security protection automatically clears when the timer expires.</p>
              </div>
            ) : forgotOpen ? (
              /* SCENARIO 2: Forgot Password & Confirmation Screen */
              <div className="space-y-6">
                {forgotSent ? (
                  /* Confirmation State */
                  <div className="space-y-5 py-2 animate-in fade-in-50 zoom-in-95">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.25)]">
                      <Send className="h-7 w-7" />
                    </div>

                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">{t('auth.checkInbox')}</h2>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {t('auth.resetLinkDispatched')}
                      </p>
                      <div className="inline-block mt-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-mono text-xs text-teal-300">
                        {forgotEmail || email}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                      {t('auth.linkValidFor')}
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800 hover:text-white"
                        disabled={resendCooldown > 0 || isLoading}
                        onClick={() => sendReset(true)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {resendCooldown > 0
                          ? `${t('auth.resendIn')} ${resendCooldown}s`
                          : t('auth.resendLink')}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-11 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                        onClick={() => {
                          setForgotOpen(false);
                          setForgotSent(false);
                          setErrorMessage(null);
                        }}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('auth.backToSignIn')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Forgot Password Request Input */
                  <div className="space-y-5 animate-in fade-in-50">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotOpen(false);
                          setErrorMessage(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t('auth.backToSignIn')}
                      </button>
                      <h2 className="text-2xl font-bold text-white tracking-tight">{t('auth.resetPassword')}</h2>
                      <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                        {t('auth.resetPasswordHint')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        {t('auth.workEmail')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="reset-email"
                          type="email"
                          value={forgotEmail || email}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="h-12 pl-10 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                          placeholder="you@tokuma.et"
                          autoFocus
                        />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button
                        className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold shadow-lg shadow-teal-500/20 rounded-xl"
                        onClick={() => sendReset(false)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {t('auth.sendResetLink')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SCENARIO 3: Standard Login & 2FA Flow */
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                      {needsCode ? 'Step 2 of 2' : 'Authorization'}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                    {needsCode ? t('auth.verifyItsYou') : t('auth.welcome')}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                    {needsCode ? t('auth.twoFactorSubtitle') : t('auth.description')}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {!needsCode ? (
                    <>
                      {/* Email Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          {t('auth.email')}
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            placeholder="operator@tokuma.et"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            className="h-12 pl-10 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                            autoComplete="email"
                          />
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            {t('auth.password')}
                          </Label>
                          <button
                            type="button"
                            className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                            onClick={() => {
                              setForgotOpen(true);
                              setErrorMessage(null);
                            }}
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            className="h-12 pl-10 pr-10 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                            autoComplete="current-password"
                          />
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <button
                            type="button"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember Device Checkbox */}
                      <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs cursor-pointer hover:border-slate-700 transition-colors">
                        <Checkbox 
                          checked={rememberDevice} 
                          onCheckedChange={(v) => setRememberDevice(v === true)} 
                          className="border-slate-600 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-200">{t('auth.rememberDevice')}</span>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-teal-400/80 shrink-0" />
                      </label>
                    </>
                  ) : (
                    /* TWO-FACTOR VERIFICATION CODE SCREEN */
                    <div className="space-y-5 animate-in fade-in-50 zoom-in-95">
                      <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0 text-teal-300">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-white">Authenticator Challenge</p>
                          <p className="text-teal-200/70">Enter the 6-digit TOTP security code</p>
                        </div>
                      </div>

                      <div className="space-y-3 flex flex-col items-center justify-center py-2">
                        <InputOTP
                          maxLength={6}
                          value={code}
                          onChange={(val) => {
                            setCode(val);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          autoFocus
                        >
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                            <InputOTPSlot index={1} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                            <InputOTPSlot index={2} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                          </InputOTPGroup>
                          <InputOTPSeparator className="text-slate-600" />
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={3} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                            <InputOTPSlot index={4} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                            <InputOTPSlot index={5} className="h-13 w-11 text-lg font-bold bg-slate-950 border-slate-700 text-white rounded-xl focus:border-teal-400 focus:ring-teal-400" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="flex justify-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                          onClick={() => {
                            setNeedsCode(false);
                            setCode('');
                            setErrorMessage(null);
                          }}
                        >
                          <ArrowLeft className="h-3 w-3" />
                          {t('auth.backToSignIn')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold tracking-wide shadow-lg shadow-teal-500/25 transition-all duration-200 rounded-xl mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {needsCode ? t('auth.verifying') : t('auth.loggingIn')}
                      </span>
                    ) : needsCode ? (
                      <span className="flex items-center justify-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {t('auth.verify')}
                      </span>
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
