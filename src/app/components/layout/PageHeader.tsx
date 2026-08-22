import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        )}
        <h2 className="font-display text-[1.85rem] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_0_rgba(255,255,255,.55),0_18px_40px_-28px_rgba(5,50,54,.35)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-[0_1px_0_rgba(255,255,255,.4)] sm:flex-row sm:items-center">
      {children}
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-6 p-4 sm:p-6 lg:p-8', className)}>{children}</div>;
}

export function Facet({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_var(--glow)]'
          : 'bg-card/80 text-muted-foreground ring-1 ring-border hover:bg-accent'
      )}
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          <div>
            {title && <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
