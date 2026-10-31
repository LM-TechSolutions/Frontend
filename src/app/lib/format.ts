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

/**
 * Formats large numbers compactly using k, m, b, t suffixes (e.g. 1.2k, 1.25k, 10.5k, 250k, 1.5m).
 * Automatically removes trailing decimal zeros and bumps tiers on boundary rounding (e.g. 999.9k -> 1m).
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  options?: { maxDecimals?: number }
): string {
  if (value == null) return '-';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(num)) return typeof value === 'string' ? value : '-';

  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  if (abs < 1000) {
    if (Number.isInteger(num)) return `${sign}${abs}`;
    const d = options?.maxDecimals ?? 2;
    return `${sign}${Number(abs.toFixed(d))}`;
  }

  const tiers = [
    { threshold: 1e12, suffix: 't' },
    { threshold: 1e9, suffix: 'b' },
    { threshold: 1e6, suffix: 'm' },
    { threshold: 1e3, suffix: 'k' },
  ];

  for (let i = 0; i < tiers.length; i++) {
    const { threshold, suffix } = tiers[i];
    if (abs >= threshold * 0.99995) {
      const scaled = abs / threshold;
      let decimals = options?.maxDecimals;
      if (decimals === undefined) {
        if (scaled < 9.995) decimals = 2;
        else if (scaled < 99.95) decimals = 1;
        else decimals = 0;
      }
      const rounded = Number(scaled.toFixed(decimals));
      if (rounded >= 1000 && i > 0) {
        const nextTier = tiers[i - 1];
        const nextScaled = abs / nextTier.threshold;
        return `${sign}${Number(nextScaled.toFixed(decimals))}${nextTier.suffix}`;
      }
      return `${sign}${rounded}${suffix}`;
    }
  }

  return `${sign}${abs}`;
}

export function formatCompactETB(amount?: number | null, currency = 'ETB'): string {
  if (amount == null) return '-';
  const num = Number(amount);
  if (!Number.isFinite(num)) return '-';
  return `${currency} ${formatCompactNumber(num)}`;
}
