import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { ApiError } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady } = useAuth();
  const { t } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in → skip the login screen.
  useEffect(() => {
    if (isReady && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isReady, isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // The backend determines the role from the account — no role selection here.
      const result = await login(email.trim(), password, needsCode ? code : undefined);
      if (result.twoFactorRequired) {
        setNeedsCode(true);
        if (!code) toast.info(t('auth.enterCode'));
        else toast.error(t('auth.invalidCode'));
        return;
      }
      toast.success(`${t('auth.loginSuccessful')} ${result.user.name}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#00BDC3] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl">{t('auth.welcome')}</CardTitle>
          <CardDescription>
            {needsCode ? t('auth.twoFactorPrompt') : t('auth.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    className="h-10 border-border"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 border-border"
                    autoComplete="current-password"
                  />
                </div>
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
                  className="h-10 border-border text-center text-lg tracking-[0.3em]"
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
            <Button
              type="submit"
              className="w-full h-10 bg-[#00BDC3] hover:bg-[#009EA3] text-white"
              disabled={isLoading}
            >
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
        </CardContent>
      </Card>
    </div>
  );
}
