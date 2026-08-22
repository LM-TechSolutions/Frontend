import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart3,
  Car,
  LayoutDashboard,
  PhoneCall,
  ScrollText,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../../contexts/AppContext';

const ALL_PAGES = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, admin: false },
  { nameKey: 'nav.analytics', href: '/analytics', icon: BarChart3, admin: true },
  { nameKey: 'nav.operators', href: '/operators', icon: UserCog, admin: true },
  { nameKey: 'nav.callLogs', href: '/call-logs', icon: PhoneCall, admin: true },
  { nameKey: 'nav.rides', href: '/rides', icon: Car, admin: false },
  { nameKey: 'nav.drivers', href: '/drivers', icon: Users, admin: false },
  { nameKey: 'nav.coupons', href: '/coupons', icon: Wallet, admin: true },
  { nameKey: 'nav.auditLog', href: '/audit-log', icon: ScrollText, admin: true },
  { nameKey: 'nav.admins', href: '/admins', icon: Shield, admin: true, super: true },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings, admin: false },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useAuth();
  const { t } = useAppContext();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pages = useMemo(
    () =>
      ALL_PAGES.filter((p) => {
        if (p.super) return isSuperAdmin;
        if (p.admin) return isAdmin;
        return true;
      }),
    [isAdmin, isSuperAdmin]
  );

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground transition hover:bg-muted md:hidden"
        title={t('common.search')}
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 min-w-[220px] items-center gap-2 rounded-full border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{t('common.searchOrJump')}</span>
        <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t('common.jumpTo')} description={t('common.pagesAndActions')}>
        <CommandInput placeholder={t('common.searchPages')} />
        <CommandList>
          <CommandEmpty>{t('common.nothingMatches')}</CommandEmpty>
          <CommandGroup heading={t('common.pages')}>
            {pages.map((page) => (
              <CommandItem key={page.href} value={t(page.nameKey)} onSelect={() => go(page.href)}>
                <page.icon className="h-4 w-4" />
                {t(page.nameKey)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t('common.actions')}>
            <CommandItem onSelect={() => go('/rides')}>
              <Car className="h-4 w-4" /> {t('dashboard.newRide')}
            </CommandItem>
            <CommandItem onSelect={() => go('/drivers')}>
              <Users className="h-4 w-4" /> {t('drivers.addButton')}
            </CommandItem>
            <CommandItem onSelect={() => go('/settings')}>
              <Settings className="h-4 w-4" /> {t('common.openSettings')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
