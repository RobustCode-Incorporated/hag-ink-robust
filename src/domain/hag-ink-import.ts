// Old Hag & Ink rows -> REM rows (pure). Spec: hag-ink-robust/specs/006-migration-rem-salon.md.

export type OldBarber = { id: string; firstName: string; lastName: string; salaryType: string; fixedSalary: number; commissionRate: number; phone: string | null };
export type OldService = { id: string; barberId: string; clientId: string | null; amount: number; createdAt: Date };
export type OldExpense = { id: string; amount: number; description: string; isValidated: boolean; createdAt: Date; userId: string | null };

/** USD float -> integer cents, exact for any 2-decimal amount. */
export function toCents(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(cents) || cents < 0) throw new Error(`Invalid amount ${amount}`);
  return cents;
}

export function staffFromBarber(b: OldBarber) {
  const fixed = b.salaryType === 'FIXED' || b.salaryType === 'MIXED';
  if (b.salaryType === 'MIXED') {
    // REM has COMMISSION or FIXED, not both: refuse silently losing pay rules.
    throw new Error(`Barber ${b.firstName} has MIXED pay: decide FIXED or COMMISSION before import`);
  }
  return {
    legacyId: b.id,
    displayName: `${b.firstName} ${b.lastName}`.trim(),
    role: 'BARBER' as const,
    payType: fixed ? ('FIXED' as const) : ('COMMISSION' as const),
    commissionRate: fixed ? 0 : b.commissionRate,
    fixedSalaryCents: fixed ? toCents(b.fixedSalary) : 0,
    phone: b.phone,
  };
}

/** Calendar date of an instant in the salon timezone (Kinshasa = UTC+1, no DST). */
export function salonDay(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export type MonthTotals = Map<string, { count: number; cents: number }>;

export function monthTotals(rows: { at: Date; cents: number }[]): MonthTotals {
  const out: MonthTotals = new Map();
  for (const r of rows) {
    const key = r.at.toISOString().slice(0, 7);
    const cur = out.get(key) ?? { count: 0, cents: 0 };
    cur.count += 1;
    cur.cents += r.cents;
    out.set(key, cur);
  }
  return out;
}

/** Months where old and new differ (count or cents). Empty = reconciled. */
export function reconcile(oldT: MonthTotals, newT: MonthTotals): string[] {
  const keys = [...new Set([...oldT.keys(), ...newT.keys()])].sort();
  return keys.filter((k) => {
    const a = oldT.get(k), b = newT.get(k);
    return !a || !b || a.count !== b.count || a.cents !== b.cents;
  });
}
