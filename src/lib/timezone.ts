// The salon lives in one timezone, but Vercel runs in UTC. Never parse a
// wall-clock time with a naive `new Date("2026-11-03T11:00")`: convert it
// explicitly with these helpers (DST-safe). Origin: Debs Hair & Beauty.
import { SALON } from '@/config/salon';

const TZ = SALON.timezone;

function parts(instant: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }).formatToParts(instant).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
}

/** UTC instant for wall-clock `time` ("HH:MM") in the salon on `date` ("YYYY-MM-DD"). */
export function salonToUtc(date: string, time: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(guess.getTime())) return guess;
  const offsetAt = (instant: Date) => {
    const p = parts(instant);
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant.getTime();
  };
  const first = new Date(guess.getTime() - offsetAt(guess));
  // Second pass: near a DST switch the offset at the result can differ from the guess.
  return new Date(guess.getTime() - offsetAt(first));
}

/** "HH:MM" in the salon for an instant. */
export function salonTime(instant: Date): string {
  const p = parts(instant);
  return `${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DD" in the salon for an instant. */
export function salonDate(instant: Date): string {
  const p = parts(instant);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date (timezone-free). */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Adds days to a "YYYY-MM-DD" calendar date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}
