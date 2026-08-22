import { formatEthiopian } from './ethiopian';
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
    unknown: 'Unknown',
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
    unknown: 'ያልታወቀ',
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
    unknown: 'Hin beekamne',
  },
};

export function rideStatusLabel(status?: string): string {
  const lang = typeof window !== 'undefined' ? window.localStorage.getItem('language') : null;
  const labels = lang === 'am' ? RIDE_STATUS_LABELS.am : lang === 'om' ? RIDE_STATUS_LABELS.om : RIDE_STATUS_LABELS.en;
  if (!status) return labels.unknown;
  return labels[status] ?? RIDE_STATUS_LABELS.en[status] ?? status;
}

export function formatETB(amount?: number | null, currency = 'ETB'): string {
  if (amount == null) return '-';
  const lang = typeof window !== 'undefined' ? window.localStorage.getItem('language') : 'en';
  const locale = lang === 'am' ? 'am-ET' : lang === 'om' ? 'om-ET' : 'en-ET';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${Number(amount).toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const lang = typeof window !== 'undefined' ? window.localStorage.getItem('language') : 'en';
  const calendar = typeof window !== 'undefined' ? window.localStorage.getItem('calendar') : 'gregorian';
  if (calendar === 'ethiopian') {
    const locale = lang === 'am' || lang === 'om' ? lang : 'en';
    return `${formatEthiopian(date, locale)} ${date.toLocaleTimeString(lang === 'am' ? 'am-ET' : 'en-ET', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const locale = lang === 'am' ? 'am-ET' : lang === 'om' ? 'om-ET' : 'en-ET';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function shortId(id?: string, len = 8): string {
  return id ? id.slice(0, len) : '';
}
