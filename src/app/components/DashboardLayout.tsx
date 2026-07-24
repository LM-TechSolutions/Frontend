import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Car, Users, Wallet, Settings, Bell, User, LogOut, Shield, BarChart3, UserCog, PhoneCall, Moon, Sun, CheckCheck } from 'lucide-react';
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
import { useEffect, useRef, useState } from 'react';
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

interface NotificationItem {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role: userRole, logout } = useAuth();
  const userName = user?.name ?? 'User';
  const { t, language, setLanguage, theme, setTheme } = useAppContext();

  const [notifItems, setNotifItems] = useState<NotificationItem[]>([
    // Sample notification so admin can preview the UI
    {
      id: 'sample-1',
      message: 'Welcome! Ride updates and status changes will appear here in real time.',
      time: new Date(),
      read: false,
      type: 'info' as const,
    },
  ]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifItems.filter((n) => !n.read).length;

  // Close on outside click or Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // Live dispatch notifications over WebSockets
  useEffect(() => {
    const socket = getSocket() ?? connectSocket();

    const onStatus = (data: any) => {
      const label = data?.statusLabel ?? rideStatusLabel(data?.status);
      const msg = `Ride ${String(data?.rideId ?? '').slice(0, 8)} → ${label}`;
      toast(msg);
      setNotifItems((prev) => [{
        id: `${Date.now()}-${Math.random()}`,
        message: msg,
        time: new Date(),
        read: false,
        type: 'info' as const,
      }, ...prev].slice(0, 50));
    };

    const onCompleted = (data: any) => {
      const msg = `Ride completed · ${data?.fare ?? ''} ${data?.currency ?? 'ETB'}`;
      toast.success(msg);
      setNotifItems((prev) => [{
        id: `${Date.now()}-${Math.random()}`,
        message: msg,
        time: new Date(),
        read: false,
        type: 'success' as const,
      }, ...prev].slice(0, 50));
    };

    socket.on('ride:status', onStatus);
    socket.on('ride:completed', onCompleted);
    return () => {
      socket.off('ride:status', onStatus);
      socket.off('ride:completed', onCompleted);
    };
  }, []);

  const markRead = (id: string) => {
    setNotifItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatTime = (d: Date) => {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const typeColor = (type: NotificationItem['type']) => ({
    info: 'bg-[#00BDC3]',
    success: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
  })[type];

  const navigation = userRole === 'admin' ? adminNavigation : operatorNavigation;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#00BDC3] flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">TEKUMMA</span>
          </div>
        </div>

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
              <p className="text-xs text-muted-foreground">
                {userRole === 'admin' ? t('auth.admin', 'Administrator') : t('common.callCenter', 'Call Center')}
              </p>
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

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-[#EF4444] text-white text-[10px] font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Dropdown panel */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-[#00BDC3] hover:text-[#009EA3] transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <Bell className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                        <p className="text-xs text-muted-foreground mt-1 opacity-60">Ride updates will appear here</p>
                      </div>
                    ) : (
                      notifItems.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/60 ${
                            !n.read ? 'bg-muted/40' : ''
                          }`}
                        >
                          {/* Color dot */}
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${typeColor(n.type)} ${n.read ? 'opacity-30' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {n.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.time)}</p>
                          </div>
                          {!n.read && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#00BDC3] flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                <DropdownMenuItem onClick={() => navigate('/settings')}>
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
