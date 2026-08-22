const DOT: Record<string, string> = {
  pending: '#e08a14',
  unassigned: '#e08a14',
  dispatched: '#00b4bb',
  accepted: '#00b4bb',
  arrived: '#00b4bb',
  in_progress: '#00b4bb',
  completed: '#1aa37a',
  cancelled: '#e24b4a',
  expired: '#7a9193',
  available: '#1aa37a',
  busy: '#e24b4a',
  offline: '#7a9193',
  active: '#1aa37a',
  inactive: '#7a9193',
  missed: '#e24b4a',
  abandoned: '#e08a14',
  enabled: '#1aa37a',
  disabled: '#7a9193',
  trusted: '#00b4bb',
  super_admin: '#e08a14',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: DOT[status] ?? '#7a9193', boxShadow: `0 0 0 3px color-mix(in srgb, ${DOT[status] ?? '#7a9193'} 22%, transparent)` }}
      />
      <span className="capitalize">{label ?? status.replace(/_/g, ' ')}</span>
    </span>
  );
}

export function waitTone(createdAt: string | Date) {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes >= 8) return { className: 'text-destructive', label: `${Math.round(minutes)}m waiting`, alarm: true };
  if (minutes >= 3) return { className: 'text-[color:var(--warning)]', label: `${Math.round(minutes)}m waiting`, alarm: false };
  return { className: 'text-muted-foreground', label: `${Math.max(1, Math.round(minutes))}m`, alarm: false };
}
