import { describe, expect, it } from 'vitest';
import { monthTotals, reconcile, salonDay, staffFromBarber, toCents } from '@/domain/hag-ink-import';
import { computePayroll } from '@/domain/payroll';

const barber = (o: Partial<Parameters<typeof staffFromBarber>[0]> = {}) => ({
  id: 'b1', firstName: 'Bilal Akuma', lastName: 'Soumaré', salaryType: 'COMMISSION', fixedSalary: 0, commissionRate: 0.3, phone: null, ...o,
});

describe('hag & ink import mapping', () => {
  it('converts USD floats to exact cents', () => {
    expect(toCents(129.27)).toBe(12927);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(() => toCents(-1)).toThrow();
  });

  it('keeps each barber commission rate (no 50 % template default)', () => {
    expect(staffFromBarber(barber())).toMatchObject({ displayName: 'Bilal Akuma Soumaré', payType: 'COMMISSION', commissionRate: 0.3 });
    expect(staffFromBarber(barber({ salaryType: 'FIXED', fixedSalary: 250 }))).toMatchObject({ payType: 'FIXED', fixedSalaryCents: 25000, commissionRate: 0 });
    expect(() => staffFromBarber(barber({ salaryType: 'MIXED' }))).toThrow(/MIXED/);
  });

  it('dates expenses in Kinshasa time', () => {
    expect(salonDay(new Date('2026-10-30T23:30:00Z'), 'Africa/Kinshasa')).toBe('2026-10-31');
  });

  it('reconciles month totals', () => {
    const a = monthTotals([{ at: new Date('2026-10-05T10:00:00Z'), cents: 6000 }, { at: new Date('2026-10-06T10:00:00Z'), cents: 4000 }]);
    const b = monthTotals([{ at: new Date('2026-10-05T10:00:00Z'), cents: 6000 }, { at: new Date('2026-10-06T10:00:00Z'), cents: 4000 }]);
    expect(reconcile(a, b)).toEqual([]);
    b.get('2026-10')!.cents += 1;
    expect(reconcile(a, b)).toEqual(['2026-10']);
  });

  it('REM payroll gives the old October commissions (4,159.50 USD)', () => {
    // October 2026 per barber revenue (production), rates 0.25 except Bilal 0.30
    const rows: [string, number, number][] = [['m', 3735, 0.25], ['b', 3690, 0.3], ['a', 3075, 0.25], ['g', 2750, 0.25], ['d', 2650, 0.25]];
    const staff = rows.map(([id, , r]) => ({ id, name: id, payType: 'COMMISSION' as const, commissionRate: r, fixedSalaryCents: 0 }));
    const sales = rows.map(([id, usd]) => ({ staffId: id, kind: 'SERVICE' as const, amountCents: toCents(usd), tipCents: 0 }));
    const sum = computePayroll(staff, sales).lines.reduce((n, l) => n + l.commissionCents, 0);
    expect(sum).toBe(415950);
  });
});
