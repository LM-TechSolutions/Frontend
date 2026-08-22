import { useEffect, useState } from 'react';
import { Shield, User } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function WelcomeMessage() {
  const [userRole, setUserRole] = useState<'admin' | 'operator'>('operator');
  const [userName, setUserName] = useState('Agent Smith');

  useEffect(() => {
    const role = localStorage.getItem('userRole') as 'admin' | 'operator' || 'operator';
    const name = localStorage.getItem('userName') || 'Agent Smith';
    setUserRole(role);
    setUserName(name);
  }, []);

  if (userRole === 'admin') {
    return (
      <Card className="bg-gradient-to-r from-primary to-[var(--primary-hover)] text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Welcome back, {userName}!</h2>
              <p className="text-white/90 text-sm">
                You have full administrative access. Monitor operations, manage operators, review analytics, and oversee all call center activities.
              </p>
              <div className="mt-3 flex gap-4 text-sm">
                <div>
                  <span className="text-white/70">Role:</span>
                  <span className="ml-1 font-semibold">Administrator</span>
                </div>
                <div>
                  <span className="text-white/70">Access Level:</span>
                  <span className="ml-1 font-semibold">Full Access</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary to-[var(--primary-hover)] text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1">Welcome back, {userName}!</h2>
            <p className="text-white/90 text-sm">
              Ready to dispatch rides and assist customers. Let's make today count!
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <div>
                <span className="text-white/70">Role:</span>
                <span className="ml-1 font-semibold">Call Center Operator</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
