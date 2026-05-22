import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Shield, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operator'>('operator');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      // Store user info in localStorage
      localStorage.setItem('userRole', selectedRole);
      localStorage.setItem('userName', selectedRole === 'admin' ? 'Admin User' : 'Agent Smith');
      localStorage.setItem('userEmail', email);
      
      toast.success(`Login successful as ${selectedRole === 'admin' ? 'Administrator' : 'Operator'}!`);
      navigate('/dashboard');
    }, 1000);
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
          <CardTitle className="text-2xl">Welcome to TEKUMMA</CardTitle>
          <CardDescription>Sign in to access the dispatch system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Login as</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('operator')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedRole === 'operator'
                      ? 'border-[#00BDC3] bg-[#00BDC3]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`w-6 h-6 ${selectedRole === 'operator' ? 'text-[#00BDC3]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'operator' ? 'text-[#00BDC3]' : 'text-gray-600'}`}>
                    Operator
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedRole === 'admin'
                      ? 'border-[#00BDC3] bg-[#00BDC3]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Shield className={`w-6 h-6 ${selectedRole === 'admin' ? 'text-[#00BDC3]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${selectedRole === 'admin' ? 'text-[#00BDC3]' : 'text-gray-600'}`}>
                    Admin
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={selectedRole === 'admin' ? 'admin@tekumma.com' : 'agent@tekumma.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border-gray-300"
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
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 bg-[#00BDC3] hover:bg-[#009EA3] text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}