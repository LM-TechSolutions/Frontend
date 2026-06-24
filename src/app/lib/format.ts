/** Map backend ride status values to the spec's display labels. */
export const RIDE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  dispatched: 'Assigned',
  accepted: 'Accepted',
  arrived: 'Driver Arriving',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  unassigned: 'Unassigned',
};

export function rideStatusLabel(status?: string): string {
  if (!status) return 'Unknown';
  return RIDE_STATUS_LABELS[status] ?? status;
}

export function formatETB(amount?: number | null): string {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB`;
}

export function shortId(id?: string, len = 8): string {
  return id ? id.slice(0, len) : '';
}
