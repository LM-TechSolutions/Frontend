/** Map backend ride status values to the spec's display labels. */
const RIDE_STATUS_LABELS: Record<string, Record<string, string>> = {
  en: {
    pending: 'Pending',
    dispatched: 'Assigned',
    accepted: 'Accepted',
    arrived: 'Driver Arriving',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    unassigned: 'Unassigned',
  },
  am: {
    pending: 'በሂደት ላይ ያለ',
    dispatched: 'የተመደበ',
    accepted: 'የተቀበለው',
    arrived: 'አሽከርካሪው እየደረሰ ነው',
    in_progress: 'በጉዞ ላይ ያለ',
    completed: 'የተጠናቀቀ',
    cancelled: 'የተሰረዘ',
    expired: 'ጊዜው ያለፈበት',
    unassigned: 'ያልተመደበ',
  },
  om: {
    pending: 'Eeggamaa Jira',
    dispatched: 'Ramadameera',
    accepted: 'Fudhatameera',
    arrived: 'Draayivarri Dhiyaachaa Jira',
    in_progress: 'Adeemsa Irra Jira',
    completed: 'Xumurameera',
    cancelled: 'Haqameera',
    expired: 'Yeroon Isa Jalaa Dhumateera',
    unassigned: 'Ramaddii Malee',
  },
};

export function rideStatusLabel(status?: string): string {
  if (!status) return 'Unknown';
  const lang = typeof window !== 'undefined' ? window.localStorage.getItem('language') : null;
  const labels = lang === 'am' ? RIDE_STATUS_LABELS.am : lang === 'om' ? RIDE_STATUS_LABELS.om : RIDE_STATUS_LABELS.en;
  return labels[status] ?? RIDE_STATUS_LABELS.en[status] ?? status;
}

export function formatETB(amount?: number | null): string {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB`;
}

export function shortId(id?: string, len = 8): string {
  return id ? id.slice(0, len) : '';
}
