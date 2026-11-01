import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  Copy, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Lock, 
  QrCode, 
  KeyRound, 
  ArrowRight, 
  LogOut, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from '../components/ui/input-otp';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { TimedAlert } from '../components/auth/TimedAlert';

export default function EnrollTwoFactor() {
  const navigate = useNavigate();
  const { completeTwoFactorEnrollment, logout, needsTwoFactorEnrollment } = useAuth();
  const { t } = useAppContext();

  const [password, setPassword] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'password' | 'confirm'>('password');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (!needsTwoFactorEnrollment) {
      navigate('/dashboard', { replace: true });
    }
  }, [needsTwoFactorEnrollment, navigate]);

  const start = async () => {
    setErrorMessage(null);
    if (!password) {
      const msg = t('auth.passwordRequired');
      setErrorMessage(msg);
      toast.error(msg);
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
      const msg = e instanceof ApiError ? e.message : t('auth.enrollStartFailed');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setErrorMessage(null);
    if (code.trim().length !== 6) {
      const msg = t('auth.enterCode');
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setBusy(true);
    try {
      await api.twoFactor.verify(code.trim());
      completeTwoFactorEnrollment();
      
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00d4db', '#10b981', '#38bdf8'],
      });

      toast.success(t('auth.enrollSuccess'));
      navigate('/dashboard', { replace: true });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('auth.invalidCode');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const copySetupKey = () => {
    if (!totpURI) return;
    navigator.clipboard.writeText(totpURI);
    setCopiedSecret(true);
    toast.info(t('auth.setupLinkCopied'));
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const copyAllBackupCodes = () => {
    if (backupCodes.length === 0) return;
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    toast.success('Backup codes copied to clipboard');
    setTimeout(() => setCopiedBackup(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex items-center justify-center p-6 relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,219,0.15),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-teal-500/10 blur-[130px]" />

      <div className="relative w-full max-w-xl my-auto">
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
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-7 sm:p-9 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]">
          {/* Header Title & Stepper Indicator */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-teal-400">
                  {t('auth.requiredToContinue')}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {t('auth.turnOn2fa')}
                </h1>
              </div>
            </div>

            {/* Step Pills */}
            <div className="hidden sm:flex items-center gap-2">
              <div className={`h-2.5 w-8 rounded-full transition-colors ${step === 'password' ? 'bg-teal-400' : 'bg-teal-500/40'}`} />
              <div className={`h-2.5 w-8 rounded-full transition-colors ${step === 'confirm' ? 'bg-teal-400' : 'bg-slate-800'}`} />
            </div>
          </div>

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

          {step === 'password' ? (
            /* STEP 1: Password Confirmation */
            <div className="space-y-6 animate-in fade-in-50">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
                For administrative compliance, all dispatchers and managers must enroll in hardware or software two-factor authentication.
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-pass" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="verify-pass"
                    type="password"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="h-12 pl-10 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-teal-400 rounded-xl"
                    autoFocus
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl"
                  onClick={start}
                  disabled={busy}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Key...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('auth.startSetup')}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="h-12 border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl"
                  onClick={() => {
                    logout();
                    navigate('/', { replace: true });
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.signOut')}
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: QR Code & TOTP Code Verification */
            <div className="space-y-6 animate-in fade-in-50">
              {/* QR Code Canvas */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                {qrCodeDataUrl ? (
                  <div className="relative shrink-0 p-2.5 rounded-2xl bg-white shadow-lg shadow-black/40">
                    <img
                      src={qrCodeDataUrl}
                      alt={t('auth.qrAlt')}
                      className="w-36 h-36 rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
                    <QrCode className="h-12 w-12" />
                  </div>
                )}

                <div className="space-y-3 text-xs sm:text-sm text-slate-300 flex-1">
                  <p className="font-semibold text-white">{t('auth.scanWithApps')}</p>
                  <p className="text-slate-400 leading-relaxed">
                    Open Google Authenticator, Microsoft Authenticator, or Authy on your mobile phone and scan this code.
                  </p>
                  {totpURI && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20 text-xs font-mono transition-colors"
                      onClick={copySetupKey}
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedSecret ? 'Secret Copied!' : t('auth.copySetupLink')}
                    </button>
                  )}
                </div>
              </div>

              {/* Offline Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      {t('auth.backupCodes')}
                    </p>
                    <button
                      type="button"
                      onClick={copyAllBackupCodes}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedBackup ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedBackup ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-slate-300">
                    {backupCodes.map((codeStr) => (
                      <div key={codeStr} className="p-1.5 text-center rounded-lg bg-slate-900 border border-slate-800 select-all">
                        {codeStr}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6-Digit Verification Input */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('auth.enterCodeToFinish')}
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(val) => {
                      setCode(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-1.5">
                      <InputOTPSlot index={0} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                      <InputOTPSlot index={1} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                      <InputOTPSlot index={2} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-slate-600" />
                    <InputOTPGroup className="gap-1.5">
                      <InputOTPSlot index={3} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                      <InputOTPSlot index={4} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                      <InputOTPSlot index={5} className="h-12 w-10 text-base font-bold bg-slate-950 border-slate-700 text-white rounded-lg focus:border-teal-400" />
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold shadow-lg shadow-teal-500/20 rounded-xl"
                    onClick={confirm}
                    disabled={busy || code.length !== 6}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('auth.enable2fa')}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
