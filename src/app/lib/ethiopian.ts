/** Ethiopian calendar conversion (algorithm from the Ethiopian Orthodox computus). */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
}

const MONTHS_AM = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'];
const MONTHS_LATIN = ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumen'];

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

export function formatEthiopian(date: Date, lang: 'en' | 'am' | 'om' = 'en'): string {
  const { year, month, day } = toEthiopian(date);
  const months = lang === 'am' ? MONTHS_AM : MONTHS_LATIN;
  const name = months[Math.max(0, Math.min(12, month - 1))] ?? String(month);
  return `${day} ${name} ${year}`;
}
