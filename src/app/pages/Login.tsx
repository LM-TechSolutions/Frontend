import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in → skip the login screen.
  useEffect(() => {
    if (isReady && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isReady, isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // The backend determines the role from the account — no role selection here.
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#00BDC3] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Tokuma</CardTitle>
          <CardDescription>Sign in to access the dispatch system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@tokuma.et"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border-gray-300"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 border-gray-300"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 bg-[#00BDC3] hover:bg-[#009EA3] text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </span>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
