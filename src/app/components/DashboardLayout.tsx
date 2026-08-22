import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Car,
  Users,
  Wallet,
  Settings,
  Bell,
  User,
  LogOut,
  Shield,
  BarChart3,
  UserCog,
  PhoneCall,
  Moon,
  Sun,
  Check,
  AlertCircle,
  Info,
  ScrollText,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { api, type InboxNotification } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { rideStatusLabel, formatDateTime } from '../lib/format';
import { CommandPalette } from './layout/CommandPalette';
import { ConnectionDot } from './layout/ConnectionDot';

const operatorNavigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'nav.rides', href: '/rides', icon: Car },
  { nameKey: 'nav.drivers', href: '/drivers', icon: Users },
  { nameKey: 'nav.coupons', href: '/coupons', icon: Wallet },
];

const adminNavigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'nav.analytics', href: '/analytics', icon: BarChart3 },
  { nameKey: 'nav.operators', href: '/operators', icon: UserCog },
  { nameKey: 'nav.callLogs', href: '/call-logs', icon: PhoneCall },
  { nameKey: 'nav.rides', href: '/rides', icon: Car },
  { nameKey: 'nav.drivers', href: '/drivers', icon: Users },
  { nameKey: 'nav.coupons', href: '/coupons', icon: Wallet },
];

const accountPages = [
  { nameKey: 'nav.notifications', href: '/notifications', icon: Bell },
  { nameKey: 'nav.auditLog', href: '/audit-log', icon: ScrollText },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings },
  { nameKey: 'nav.admins', href: '/admins', icon: Shield },
];

const SIDEBAR_KEY = 'tokuma.sidebarCollapsed';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role: userRole, logout, isSuperAdmin } = useAuth();
  const userName = user?.name ?? 'User';
  const { t, language, setLanguage, theme, setTheme } = useAppContext();
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setCollapsedPersist = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
  };

  const refreshInbox = () => {
    api.notifications
      .list({ limit: 20 })
      .then((res) => setNotifications(res.notifications ?? []))
      .catch(() => undefined);
    api.notifications
      .unreadCount()
      .then((res) => setUnreadCount(res.count ?? 0))
      .catch(() => undefined);
  };

  useEffect(() => {
    refreshInbox();
    const socket = getSocket() ?? connectSocket();

    const onNew = (payload: any) => {
      toast.info(payload.title ?? 'Notification', { description: payload.message });
      refreshInbox();
    };

    const onStatus = (data: any) => {
      const label = data?.statusLabel ?? rideStatusLabel(data?.status);
      toast.info(`Ride #${String(data?.rideId ?? '').slice(0, 8)}`, { description: label });
    };
    const onCompleted = (data: any) => {
      toast.success('Ride completed', {
        description: `Fare: ${data?.fare ?? 0} ${data?.currency ?? 'ETB'}`,
      });
    };

    socket.on('notification:new', onNew);
    socket.on('ride:status', onStatus);
    socket.on('ride:completed', onCompleted);
    socket.io.on('reconnect', refreshInbox);

    return () => {
      socket.off('notification:new', onNew);
      socket.off('ride:status', onStatus);
      socket.off('ride:completed', onCompleted);
      socket.io.off('reconnect', refreshInbox);
    };
  }, []);

  const navigation = useMemo(() => {
    const base = userRole === 'admin' ? adminNavigation : operatorNavigation;
    if (!isSuperAdmin) return base;
    return [...base, { nameKey: 'nav.admins', href: '/admins', icon: Shield }];
  }, [userRole, isSuperAdmin]);

  const current = [...navigation, ...accountPages].find(
    (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
  );

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const NavList = ({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) => (
    <nav className={cn('min-h-0 flex-1 space-y-1 overflow-y-auto', compact ? 'px-2 py-3' : 'p-3')}>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
        const label = t(item.nameKey);
        const button = (
          <button
            key={item.nameKey}
            onClick={() => {
              navigate(item.href);
              onNavigate?.();
            }}
            className={cn(
              'flex w-full items-center rounded-xl text-left transition-all',
              compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_10px_24px_-12px_rgba(0,212,219,.9)]'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!compact && <span className="truncate text-[0.95rem] font-semibold">{label}</span>}
          </button>
        );
        if (!compact) return button;
        return (
          <Tooltip key={item.nameKey}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  const SidebarBody = ({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) => (
    <>
      <div className={cn('flex h-16 items-center border-b border-sidebar-border', compact ? 'justify-center px-2' : 'gap-3 px-4')}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-lg font-bold text-sidebar-primary-foreground shadow-[0_0_28px_rgba(0,212,219,0.45)]">
          T
        </div>
        {!compact && (
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-[0.16em] text-sidebar-foreground">TEKUMMA</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">Live ops</p>
          </div>
        )}
      </div>
      <NavList onNavigate={onNavigate} compact={compact} />
      <div className={cn('shrink-0 border-t border-sidebar-border', compact ? 'p-2' : 'p-3')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {compact ? (
              <button
                type="button"
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-sidebar-primary transition hover:bg-sidebar-accent"
                aria-label={userName}
              >
                {userRole === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5 text-left transition hover:bg-sidebar-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/20 text-sidebar-primary">
                  {userRole === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{userName}</p>
                  <p className="text-xs text-sidebar-foreground/50">
                    {userRole === 'admin' ? t('auth.admin', 'Administrator') : t('common.callCenter', 'Call Center')}
                  </p>
                </div>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={compact ? 'right' : 'top'}
            align={compact ? 'end' : 'start'}
            sideOffset={10}
            className="w-52"
          >
            <DropdownMenuLabel>{t('common.account', 'My Account')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigate('/settings');
                onNavigate?.();
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('nav.settings', 'Settings')}
            </DropdownMenuItem>
            {userRole === 'admin' && (
              <DropdownMenuItem
                onClick={() => {
                  navigate('/audit-log');
                  onNavigate?.();
                }}
              >
                <ScrollText className="mr-2 h-4 w-4" />
                {t('nav.auditLog', 'Audit log')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.logout', 'Logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex h-svh overflow-hidden">
        <aside
          className={cn(
            'relative hidden h-svh shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex',
            collapsed ? 'w-[80px]' : 'w-[264px]'
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="ambient-blob absolute -left-10 top-10 h-40 w-40 rounded-full bg-sidebar-primary/20 blur-3xl" />
            <div className="absolute -right-8 bottom-24 h-32 w-32 rounded-full bg-[#e08a14]/10 blur-3xl" />
          </div>
          <div className="relative flex h-full min-h-0 flex-col">
            <SidebarBody compact={collapsed} />
            <button
              type="button"
              onClick={() => setCollapsedPersist(!collapsed)}
              className="absolute -right-3 top-[4.75rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </div>
        </aside>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <SidebarBody onNavigate={() => setDrawerOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="z-20 flex h-[4.25rem] shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/75 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">TEKUMMA</p>
                <h1 className="truncate font-display text-lg font-semibold text-foreground sm:text-xl">
                  {t(current?.nameKey || 'nav.dashboard')}
                </h1>
              </div>
              <ConnectionDot />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <CommandPalette />
              <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'am' | 'om')}>
                <SelectTrigger className="h-9 w-[118px] rounded-full bg-card">
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
                className="rounded-full"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs font-semibold">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            void api.notifications.markAllRead().then(refreshInbox);
                          }}
                          className="text-primary hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPopoverOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-muted-foreground">
                        <p className="text-sm font-medium">{t('inbox.noneNew', 'No new notifications')}</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.isRead) void api.notifications.markRead(n.id).then(refreshInbox);
                            if (n.actionUrl) navigate(n.actionUrl);
                            else navigate('/notifications');
                            setPopoverOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50',
                            !n.isRead && 'bg-primary/5'
                          )}
                        >
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                            {n.type.includes('coupon') || n.type.includes('alert') ? (
                              <AlertCircle className="h-4 w-4 text-[color:var(--warning)]" />
                            ) : n.type.includes('completed') ? (
                              <Check className="h-4 w-4 text-[color:var(--success)]" />
                            ) : (
                              <Info className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{n.message}</p>
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                          </div>
                          {!n.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
