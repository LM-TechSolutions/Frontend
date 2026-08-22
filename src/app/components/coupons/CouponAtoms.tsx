import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';

/**
 * Shared visual language for the coupon economy screens.
 *
 * Coupons are a *quantity* the whole hierarchy reasons about, so every surface
 * that shows one uses the same tone scale (healthy / watch / critical) and the
 * same tabular figures. A balance means the same thing whether it is an
 * operator's inventory or a driver's wallet.
 */

export type CouponTone = 'healthy' | 'watch' | 'critical';

export function couponTone(balance: number, threshold: number): CouponTone {
  if (balance <= threshold * 0.5) return 'critical';
  if (balance <= threshold) return 'watch';
  return 'healthy';
}

export const TONE_STYLES: Record<CouponTone, { text: string; bg: string; ring: string; label: string }> = {
  healthy: {
    text: 'text-[#059669] dark:text-[#34D399]',
    bg: 'bg-[#10B981]/10',
    ring: 'ring-[#10B981]/30',
    label: 'Healthy',
  },
  watch: {
    text: 'text-[#B45309] dark:text-[#FBBF24]',
    bg: 'bg-[#F59E0B]/10',
    ring: 'ring-[#F59E0B]/30',
    label: 'Running low',
  },
  critical: {
    text: 'text-[#DC2626] dark:text-[#F87171]',
    bg: 'bg-[#EF4444]/10',
    ring: 'ring-[#EF4444]/30',
    label: 'Critical',
  },
};

/** A number that matters, with its label and an optional trend note. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = '#00b4bb',
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative overflow-hidden transition-all',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(5,50,54,.4)]'
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p
              className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-foreground"
              style={{ color: accent }}
            >
              {value}
            </p>
            {hint && <p className="mt-2 text-xs text-muted-foreground truncate">{hint}</p>}
          </div>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `${accent}1f` }}
          >
            <Icon className="h-5 w-5" style={{ color: accent }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Compact balance readout. Same tone everywhere a wallet is shown. */
export function BalancePill({
  balance,
  threshold,
  size = 'md',
}: {
  balance: number;
  threshold: number;
  size?: 'sm' | 'md';
}) {
  const tone = TONE_STYLES[couponTone(balance, threshold)];
  return (
    <span className={cn('inline-flex items-baseline gap-1 font-semibold tabular-nums', tone.text, size === 'sm' ? 'text-sm' : 'text-base')}>
      {balance.toLocaleString()}
      <span className="font-normal text-muted-foreground">{balance === 1 ? 'coupon' : 'coupons'}</span>
    </span>
  );
}

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#e08a14' },
  approved: { label: 'Approved', color: '#1aa37a' },
  rejected: { label: 'Rejected', color: '#e24b4a' },
  cancelled: { label: 'Withdrawn', color: '#7a9193' },
};

export function RequestStatusChip({ status }: { status: string }) {
  const meta = REQUEST_STATUS[status] ?? REQUEST_STATUS.cancelled;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: meta.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color} 22%, transparent)` }}
      />
      {meta.label}
    </span>
  );
}

/** Initials avatar, used for drivers and operators alike. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary',
        className
      )}
    >
      {initials}
    </div>
  );
}

/** Consistent empty state - an icon, a headline, and what to do about it. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Row skeleton so lists settle in place instead of jumping. */
export function RowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Human-friendly relative time for ledger and request rows. */
export function timeAgo(value: string | Date): string {
  const then = new Date(value).getTime();
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}
