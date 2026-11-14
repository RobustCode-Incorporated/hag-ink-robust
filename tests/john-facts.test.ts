import { describe, expect, it } from 'vitest';
import { buildMonthlyFacts, shiftMonth } from '@/domain/john-facts';

const staff = [
  { id: 'o', name: 'Direction', role: 'OWNER', payType: 'FIXED' as const, commissionRate: 0, fixedSalaryCents: 0 },
  { id: 'a', name: 'Ana', role: 'BARBER', payType: 'COMMISSION' as const, commissionRate: 0.3, fixedSalaryCents: 0 },
  { id: 'b', name: 'Ben', role: 'BARBER', payType: 'COMMISSION' as const, commissionRate: 0.25, fixedSalaryCents: 0 },
];
const sale = (staffId: string, cents: number, day: string) => ({ staffId, kind: 'SERVICE' as const, cents, tipCents: 0, day });

describe('JOHN monthly facts (REM)', () => {
  const f = buildMonthlyFacts({
    periodKey: '2026-10', language: 'en', staff,
    business: { name: 'Hag & Ink', sector: 'salon', currency: 'USD', locale: 'fr-CD' },
    sales: [...Array.from({ length: 9 }, () => sale('a', 10000, '2026-10-05')), sale('b', 5000, '2026-10-06'), sale('a', 40000, '2026-09-10'), sale('b', 40000, '2026-09-11')],
    expenses: [
      { cents: 2000, description: 'Pressing', status: 'PENDING', day: '2026-08-06' },
      { cents: 30000, description: 'Groupe & Frigo', status: 'PENDING', day: '2026-10-30' },
      { cents: 4000, description: 'Wifi', status: 'APPROVED', day: '2026-10-09' },
      { cents: 9999, description: 'Refusée', status: 'REJECTED', day: '2026-10-10' },
    ],
  });
  it('headline in dollars, payroll from REM rules', () => {
    expect(f.headline.map((m) => m.value)).toEqual([950, 10, 95, 282.5]);
    expect(f.result.value).toBe(950 - 282.5 - 40);
  });
  it('pending expenses (all months) come first; rejected ones are ignored', () => {
    expect(f.actions[0]).toMatchObject({ code: 'validate_expenses', params: { count: 2, total: 320 } });
    expect(f.alerts.find((a) => a.code === 'top_expense')?.params).toEqual({ description: 'Groupe & Frigo', amount: 300 });
  });
  it('only barbers appear in the ranking', () => {
    expect(f.breakdown.rows.map((r) => r.label)).toEqual(['Ana', 'Ben']);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('JOHN release notes', () => {
  it('keeps notes dated from the period start up to now', () => {
    const notes = [{ date: '2026-09-30', fr: 'vieux', en: 'old' }, { date: '2026-10-15', fr: 'oct', en: 'oct' }, { date: '2026-11-02', fr: 'nov', en: 'nov' }, { date: '2026-12-01', fr: 'futur', en: 'future' }];
    const f = buildMonthlyFacts({ periodKey: '2026-10', language: 'en', staff: [], sales: [], expenses: [], releaseNotes: notes, now: new Date('2026-11-02T12:00:00Z'),
      business: { name: 'X', sector: 'salon', currency: 'USD', locale: 'fr-CD' } });
    expect(f.updates.map((n) => n.en)).toEqual(['oct', 'nov']);
  });
});
