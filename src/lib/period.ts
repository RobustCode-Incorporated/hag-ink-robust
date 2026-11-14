import { salonDate, salonToUtc, addDays } from '@/lib/timezone';

export type PeriodKey = 'today' | '7d' | '30d' | 'month' | 'lastmonth' | 'year';
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" }, { key: '7d', label: '7 jours' }, { key: '30d', label: '30 jours' },
  { key: 'month', label: 'Ce mois' }, { key: 'lastmonth', label: 'Mois passé' }, { key: 'year', label: 'Cette année' },
];

/** [from, to) in UTC for a period, computed on the salon's calendar. */
export function periodRange(key: string | undefined): { key: PeriodKey; from: Date; to: Date; label: string } {
  const today = salonDate(new Date());
  const tomorrow = addDays(today, 1);
  const k = (PERIODS.find((p) => p.key === key)?.key ?? 'month') as PeriodKey;
  const monthStart = `${today.slice(0, 7)}-01`;
  let from = today, to = tomorrow;
  if (k === '7d') from = addDays(today, -6);
  if (k === '30d') from = addDays(today, -29);
  if (k === 'month') from = monthStart;
  if (k === 'year') from = `${today.slice(0, 4)}-01-01`;
  if (k === 'lastmonth') {
    to = monthStart;
    const d = new Date(`${monthStart}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1);
    from = d.toISOString().slice(0, 10);
  }
  return { key: k, from: salonToUtc(from, '00:00'), to: salonToUtc(to, '00:00'), label: PERIODS.find((p) => p.key === k)!.label };
}

/** Month "YYYY-MM" → [from, to) UTC. */
export function monthRange(month: string): { from: Date; to: Date } {
  const start = `${month}-01`;
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return { from: salonToUtc(start, '00:00'), to: salonToUtc(d.toISOString().slice(0, 10), '00:00') };
}
