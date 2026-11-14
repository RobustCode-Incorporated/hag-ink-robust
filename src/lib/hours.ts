import 'server-only';
import { query } from '@/lib/db';
import { SALON, type DayHours } from '@/config/salon';

/** Opening hours from the DB (falls back to config). Index = weekday, 0 = Sunday. */
export async function getOpeningHours(): Promise<DayHours[]> {
  try {
    const rows = await query<{ weekday: number; opens: string | null; closes: string | null }>(
      `SELECT weekday, to_char(opens,'HH24:MI') AS opens, to_char(closes,'HH24:MI') AS closes FROM opening_hours`,
    );
    const out: DayHours[] = [...SALON.openingHours];
    for (const r of rows) out[r.weekday] = r.opens && r.closes ? { opens: r.opens, closes: r.closes } : null;
    return out;
  } catch {
    return [...SALON.openingHours];
  }
}
