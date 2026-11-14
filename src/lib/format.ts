import { SALON } from '@/config/salon';
/** Money in the salon currency (SALON.currency). Name kept for history: not euro-only. */
export function euros(cents: number, locale: string = SALON.locale): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: SALON.currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** Public price: 0 means the price depends on the request (shown as onQuoteLabel). */
export function priceLabel(cents: number, onQuoteLabel: string, locale: string = SALON.locale): string {
  return cents > 0 ? euros(cents, locale) : onQuoteLabel;
}

/** "25", "25,50", "25.5" → 2500 / 2550. Returns null if invalid. */
export function parseEurosToCents(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return null;
  return Math.round(n * 100);
}

/** Local phone normalisation with the salon country code: "0470 12 34 56" → "+32470123456" (BE). */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let p = raw.replace(/[\s().\-/]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  else if (p.startsWith('0')) p = `+${SALON.phoneCountryCode}${p.slice(1)}`;
  else if (!p.startsWith('+')) p = `+${p}`;
  return /^\+\d{8,15}$/.test(p) ? p : null;
}
