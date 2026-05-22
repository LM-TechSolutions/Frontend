import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Car, Users, Wallet, Settings, Bell, User, LogOut, Shield, BarChart3, UserCog, PhoneCall } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { useEffect, useState } from 'react';

const operatorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Rides', href: '/rides', icon: Car },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Coupons', href: '/coupons', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Operators', href: '/operators', icon: UserCog },
  { name: 'Call Logs', href: '/call-logs', icon: PhoneCall },
  { name: 'Rides', href: '/rides', icon: Car },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Coupons', href: '/coupons', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<'admin' | 'operator'>('operator');
  const [userName, setUserName] = useState('Agent Smith');

  useEffect(() => {
    const role = localStorage.getItem('userRole') as 'admin' | 'operator' || 'operator';
    const name = localStorage.getItem('userName') || 'Agent Smith';
    setUserRole(role);
    setUserName(name);
  }, []);

  const navigation = userRole === 'admin' ? adminNavigation : operatorNavigation;

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#00BDC3] flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-[#111827]">TEKUMMA</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#00BDC3] text-white'
                    : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              {userRole === 'admin' ? (
                <Shield className="w-5 h-5 text-[#00BDC3]" />
              ) : (
                <User className="w-5 h-5 text-[#6B7280]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#111827] truncate">{userName}</p>
              <p className="text-xs text-[#6B7280]">{userRole === 'admin' ? 'Administrator' : 'Call Center'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-[#111827]">
              {navigation.find(item => item.href === location.pathname)?.name || 'TEKUMMA'}
            </h1>
            {userRole === 'admin' && (
              <Badge className="bg-[#00BDC3] text-white hover:bg-[#00BDC3]">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-[#6B7280]" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EF4444] text-white text-xs">
                3
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    {userRole === 'admin' ? (
                      <Shield className="w-4 h-4 text-[#00BDC3]" />
                    ) : (
                      <User className="w-4 h-4 text-[#6B7280]" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-[#111827]">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}