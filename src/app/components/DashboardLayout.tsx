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
import { toast } from 'sonner';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel } from '../lib/format';

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
  const { user, role: userRole, logout } = useAuth();
  const userName = user?.name ?? 'User';
  const { t, language, setLanguage, theme, setTheme } = useAppContext();
  const [notifications, setNotifications] = useState(0);

  // Live dispatch notifications over WebSockets (centralized for the whole dashboard).
  useEffect(() => {
    const socket = getSocket() ?? connectSocket();

    const onStatus = (data: any) => {
      setNotifications((n) => n + 1);
      const label = data?.statusLabel ?? rideStatusLabel(data?.status);
      toast(`Ride ${String(data?.rideId ?? '').slice(0, 8)} → ${label}`);
    };
    const onCompleted = (data: any) => {
      setNotifications((n) => n + 1);
      toast.success(`Ride completed · ${data?.fare ?? ''} ${data?.currency ?? 'ETB'}`);
    };

    socket.on('ride:status', onStatus);
    socket.on('ride:completed', onCompleted);

    return () => {
      socket.off('ride:status', onStatus);
      socket.off('ride:completed', onCompleted);
    };
  }, []);

  const navigation = userRole === 'admin' ? adminNavigation : operatorNavigation;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#00BDC3] flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">TEKUMMA</span>
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
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{t(item.nameKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              {userRole === 'admin' ? (
                <Shield className="w-5 h-5 text-[#00BDC3]" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole === 'admin' ? t('auth.admin', 'Administrator') : t('common.callCenter', 'Call Center')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              {t(navigation.find(item => item.href === location.pathname)?.nameKey || 'nav.dashboard') || 'TEKUMMA'}
            </h1>
            {userRole === 'admin' && (
              <Badge className="bg-[#00BDC3] text-white hover:bg-[#00BDC3]">
                <Shield className="w-3 h-3 mr-1" />
                {t('common.adminBadge', 'Admin')}
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
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>

            <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifications(0)}>
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EF4444] text-white text-xs">
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </Button>

            <Button variant="outline" size="icon" onClick={handleLogout} className="border-border text-foreground hover:bg-accent">
              <LogOut className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    {userRole === 'admin' ? (
                      <Shield className="w-4 h-4 text-[#00BDC3]" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('common.account', 'My Account')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  {t('common.profile', 'Profile')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('nav.settings', 'Settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('common.logout', 'Logout')}
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