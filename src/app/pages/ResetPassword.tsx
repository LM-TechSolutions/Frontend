import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  Check, 
  X as XIcon, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { api, ApiError } from '../lib/api';
import { useAppContext } from '../contexts/AppContext';
import { TimedAlert } from '../components/auth/TimedAlert';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useAppContext();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCount, setRedirectCount] = useState(4);

  // Check token
  useEffect(() => {
    if (!token) {
      setErrorMessage(t('auth.missingToken'));
    }
  }, [token, t]);

  // Redirect countdown on success
  useEffect(() => {
    if (!isSuccess) return;
    const interval = setInterval(() => {
      setRedirectCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess, navigate]);

  // Password criteria evaluation
  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumberOrSymbol: /[\d\W]/.test(password),
      matches: password.length > 0 && password === confirm,
    };
  }, [password, confirm]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLength) score += 1;
    if (criteria.hasUpper && criteria.hasLower) score += 1;
    if (criteria.hasNumberOrSymbol) score += 1;
    if (password.length >= 12) score += 1;
    return score;
  }, [password, criteria]);

  const strengthMeta = useMemo(() => {
    if (password.length === 0) return { label: '', color: 'bg-slate-700', width: 'w-0' };
    if (strengthScore <= 1) return { label: t('auth.passwordStrengthWeak'), color: 'bg-rose-500', width: 'w-1/4' };
    if (strengthScore <= 2) return { label: t('auth.passwordStrengthWeak'), color: 'bg-amber-500', width: 'w-2/4' };
    if (strengthScore === 3) return { label: t('auth.passwordStrengthGood'), color: 'bg-teal-400', width: 'w-3/4' };
    return { label: t('auth.passwordStrengthStrong'), color: 'bg-emerald-400', width: 'w-full' };
  }, [password, strengthScore, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      const msg = t('auth.missingToken');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 8) {
      const msg = t('auth.minChars');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirm) {
      const msg = t('auth.passwordsMismatch');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setBusy(true);
    try {
      await api.auth.resetPassword(token, password, confirm);
      setIsSuccess(true);
      toast.success(t('auth.passwordUpdated'));

      // Celebratory confetti blast
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00d4db', '#10b981', '#38bdf8'],
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('auth.resetFailed');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans text-slate-100 selection:bg-teal-500 selection:text-white">
      {/* Background radial effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(0,212,219,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-400 p-0.5 shadow-md">
              <img src="/logo.png" alt="Tokuma" className="h-full w-full object-contain rounded-lg" />
            </div>
            <span className="font-display font-bold tracking-[0.2em] text-white text-sm">TOKUMA</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-8 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]">
          {/* Timed Error Message Banner */}
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

          {/* SCENARIO 1: Success Confirmation View */}
          {isSuccess ? (
            <div className="text-center py-4 space-y-6 animate-in fade-in-50 zoom-in-95">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{t('auth.passwordUpdated')}</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Your security credentials have been updated successfully across all staff systems.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs font-mono text-teal-300">
                {t('auth.redirecting')} ({redirectCount}s)
              </div>

              <Button
                asChild
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl"
              >
                <Link to="/">
                  {t('auth.backToSignIn')}
                </Link>
              </Button>
            </div>
          ) : !token ? (
            /* SCENARIO 2: Missing or Invalid Token View */
            <div className="text-center py-4 space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{t('auth.missingToken')}</h2>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  The password reset link is invalid or has expired. Please request a new recovery link from the sign-in screen.
                </p>
              </div>

              <Button
                asChild
                className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('auth.backToSignIn')}
                </Link>
              </Button>
            </div>
          ) : (
            /* SCENARIO 3: Reset Password Form */
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{t('auth.chooseNewPassword')}</h1>
                  <p className="text-xs text-slate-400">Set a secure password for your staff account</p>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.newPassword')}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="h-12 pl-10 pr-10 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                    autoFocus
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Strength:</span>
                      <span className="font-semibold text-slate-300">{strengthMeta.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strengthMeta.color} ${strengthMeta.width}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.confirmPassword')}
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="h-12 pl-10 pr-10 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  {criteria.minLength ? (
                    <Check className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  ) : (
                    <XIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  )}
                  <span className={criteria.minLength ? 'text-slate-200' : ''}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  {criteria.matches ? (
                    <Check className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  ) : (
                    <XIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  )}
                  <span className={criteria.matches ? 'text-slate-200' : ''}>Passwords match exactly</span>
                </div>
              </div>

              {/* Update Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl mt-2"
                disabled={busy}
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  t('auth.updatePassword')
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('auth.backToSignIn')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
