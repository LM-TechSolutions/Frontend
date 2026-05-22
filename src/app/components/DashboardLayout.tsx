import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Car, Users, Wallet, Settings, Bell, User, LogOut, Shield, BarChart3, UserCog, PhoneCall, Moon, Sun } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const operatorNavigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'nav.rides', href: '/rides', icon: Car },
  { nameKey: 'nav.drivers', href: '/drivers', icon: Users },
  { nameKey: 'nav.coupons', href: '/coupons', icon: Wallet },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'nav.analytics', href: '/analytics', icon: BarChart3 },
  { nameKey: 'nav.operators', href: '/operators', icon: UserCog },
  { nameKey: 'nav.callLogs', href: '/call-logs', icon: PhoneCall },
  { nameKey: 'nav.rides', href: '/rides', icon: Car },
  { nameKey: 'nav.drivers', href: '/drivers', icon: Users },
  { nameKey: 'nav.coupons', href: '/coupons', icon: Wallet },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<'admin' | 'operator'>('operator');
  const [userName, setUserName] = useState('Agent Smith');
  const { t, language, setLanguage, theme, setTheme } = useAppContext();

  useEffect(() => {
    const role = (localStorage.getItem('userRole') as 'admin' | 'operator') || 'operator';
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
                key={item.nameKey}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#00BDC3] text-white'
                    : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{t(item.nameKey)}</span>
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
              {t(navigation.find(item => item.href === location.pathname)?.nameKey || 'nav.dashboard') || 'TEKUMMA'}
            </h1>
            {userRole === 'admin' && (
              <Badge className="bg-[#00BDC3] text-white hover:bg-[#00BDC3]">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'am' | 'om')}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder={t('common.language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">አማርኛ</SelectItem>
                <SelectItem value="om">Oromiffa</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-[#6B7280]" />
              ) : (
                <Moon className="w-5 h-5 text-[#6B7280]" />
              )}
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-[#6B7280]" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EF4444] text-white text-xs">
                3
              </Badge>
            </Button>

            <Button variant="outline" size="icon" onClick={handleLogout} className="border-[#E5E7EB] text-[#111827] hover:bg-[#F3F4F6]">
              <LogOut className="w-5 h-5" />
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