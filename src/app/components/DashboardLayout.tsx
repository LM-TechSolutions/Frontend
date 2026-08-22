import { Outlet, useNavigate, useLocation } from 'react-router';
import { LayoutDashboard, Car, Users, Wallet, Settings, Bell, User, LogOut, Shield, BarChart3, UserCog, PhoneCall, Moon, Sun, Check, AlertCircle, Info, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
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

export interface WebNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'status' | 'completed' | 'alert' | 'driver' | 'coupon';
  time: Date;
  read: boolean;
  link?: string;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role: userRole, logout } = useAuth();
  const userName = user?.name ?? 'User';
  const { t, language, setLanguage, theme, setTheme } = useAppContext();
  const [notifications, setNotifications] = useState<WebNotificationItem[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pushNotification = (item: Omit<WebNotificationItem, 'id' | 'time' | 'read'>) => {
    const newItem: WebNotificationItem = {
      id: Math.random().toString(36).slice(2, 9),
      time: new Date(),
      read: false,
      ...item,
    };
    setNotifications((prev) => [newItem, ...prev.slice(0, 49)]);
  };

  // Live dispatch & system notifications over WebSockets
  useEffect(() => {
    const socket = getSocket() ?? connectSocket();

    const onStatus = (data: any) => {
      const label = data?.statusLabel ?? rideStatusLabel(data?.status);
      const rideIdStr = String(data?.rideId ?? '').slice(0, 8);
      const title = `Ride Status: ${label}`;
      const message = `Ride #${rideIdStr} status updated to ${label}`;

      toast.info(title, { description: message });
      pushNotification({
        title,
        message,
        type: 'status',
        link: data?.rideId ? `/rides/${data.rideId}` : '/rides',
      });
    };

    const onCompleted = (data: any) => {
      const rideIdStr = String(data?.rideId ?? '').slice(0, 8);
      const title = 'Ride Completed 🎉';
      const message = `Ride #${rideIdStr} finished. Fare: ${data?.fare ?? 0} ${data?.currency ?? 'ETB'}`;

      toast.success(title, { description: message });
      pushNotification({
        title,
        message,
        type: 'completed',
        link: data?.rideId ? `/rides/${data.rideId}` : '/rides',
      });
    };

    const onDriverStatus = (data: any) => {
      const title = `Driver Status Changed`;
      const message = `Driver ${data?.driverId ? '#' + String(data.driverId).slice(0, 8) : ''} is now ${data?.status || (data?.isOnline ? 'Online' : 'Offline')}`;

      toast(title, { description: message });
      pushNotification({
        title,
        message,
        type: 'driver',
        link: '/drivers',
      });
    };

    const onSystemAlert = (data: any) => {
      const title = `System Alert`;
      const message = data?.message ?? 'System alert emitted';

      toast.warning(title, { description: message });
      pushNotification({
        title,
        message,
        type: 'alert',
      });
    };

    const onCouponAlert = (data: any) => {
      const title = `Coupon Alert`;
      const message = data?.balance === 0 ? `Driver ${data?.driverId} has 0 coupons remaining` : `Driver ${data?.driverId} coupon balance low: ${data?.balance}`;

      toast.warning(title, { description: message });
      pushNotification({
        title,
        message,
        type: 'coupon',
        link: '/coupons',
      });
    };

    socket.on('ride:status', onStatus);
    socket.on('ride:accepted', onStatus);
    socket.on('ride:arrived', onStatus);
    socket.on('ride:started', onStatus);
    socket.on('ride:completed', onCompleted);
    socket.on('ride:cancelled', onStatus);
    socket.on('driver:status', onDriverStatus);
    socket.on('system:alert', onSystemAlert);
    socket.on('coupon:low', onCouponAlert);
    socket.on('coupon:empty', onCouponAlert);

    return () => {
      socket.off('ride:status', onStatus);
      socket.off('ride:accepted', onStatus);
      socket.off('ride:arrived', onStatus);
      socket.off('ride:started', onStatus);
      socket.off('ride:completed', onCompleted);
      socket.off('ride:cancelled', onStatus);
      socket.off('driver:status', onDriverStatus);
      socket.off('system:alert', onSystemAlert);
      socket.off('coupon:low', onCouponAlert);
      socket.off('coupon:empty', onCouponAlert);
    };
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

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

            {/* Notifications Popover */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-[#EF4444] text-white text-xs font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0 border border-border bg-card shadow-xl rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#00BDC3]" />
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Badge className="bg-[#00BDC3] text-white text-xs py-0.5 px-2">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[#00BDC3] hover:underline font-medium">
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={clearNotifications} className="text-muted-foreground hover:underline">
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#00BDC3]" />
                      <p className="text-sm font-medium">No new notifications</p>
                      <p className="text-xs text-muted-foreground">Live ride & system alerts will appear here</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) navigate(n.link);
                          setPopoverOpen(false);
                        }}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          n.read ? 'hover:bg-muted/40' : 'bg-[#00BDC3]/5 hover:bg-[#00BDC3]/10'
                        }`}
                      >
                        <div className="mt-0.5 p-2 rounded-lg bg-background border border-border">
                          {n.type === 'completed' ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : n.type === 'alert' || n.type === 'coupon' ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Info className="w-4 h-4 text-[#00BDC3]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                            {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#00BDC3] mt-1.5" />}
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

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
