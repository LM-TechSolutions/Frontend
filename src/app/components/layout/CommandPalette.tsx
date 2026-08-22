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

const ALL_PAGES = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, admin: false },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, admin: true },
  { name: 'Operators', href: '/operators', icon: UserCog, admin: true },
  { name: 'Call logs', href: '/call-logs', icon: PhoneCall, admin: true },
  { name: 'Rides', href: '/rides', icon: Car, admin: false },
  { name: 'Drivers', href: '/drivers', icon: Users, admin: false },
  { name: 'Coupons', href: '/coupons', icon: Wallet, admin: false },
  { name: 'Audit log', href: '/audit-log', icon: ScrollText, admin: true },
  { name: 'Administrators', href: '/admins', icon: Shield, admin: true, super: true },
  { name: 'Settings', href: '/settings', icon: Settings, admin: false },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useAuth();
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
        title="Search"
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 min-w-[220px] items-center gap-2 rounded-full border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump…</span>
        <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Jump to" description="Pages and actions">
        <CommandInput placeholder="Rides, drivers, settings…" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem key={page.href} value={page.name} onSelect={() => go(page.href)}>
                <page.icon className="h-4 w-4" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go('/rides')}>
              <Car className="h-4 w-4" /> New ride
            </CommandItem>
            <CommandItem onSelect={() => go('/drivers')}>
              <Users className="h-4 w-4" /> Add a driver
            </CommandItem>
            <CommandItem onSelect={() => go('/settings')}>
              <Settings className="h-4 w-4" /> Open settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
