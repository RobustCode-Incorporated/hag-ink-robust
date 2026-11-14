import { describe, expect, it } from 'vitest';
import { computePayroll } from '@/domain/payroll';

describe('computePayroll', () => {
  const staff = [
    { id: 'm', name: 'Machiner', payType: 'COMMISSION' as const, commissionRate: 0.5, fixedSalaryCents: 0 },
    { id: 'r', name: 'Réception', payType: 'FIXED' as const, commissionRate: 0, fixedSalaryCents: 180000 },
  ];

  it('pays commission on services only, tips in full, fixed salaries as-is', () => {
    const r = computePayroll(staff, [
      { staffId: 'm', kind: 'SERVICE', amountCents: 2500, tipCents: 500 },
      { staffId: 'm', kind: 'SERVICE', amountCents: 3000, tipCents: 0 },
      { staffId: 'm', kind: 'PRODUCT', amountCents: 1000, tipCents: 0 },
    ]);
    const m = r.lines.find((l) => l.staffId === 'm')!;
    expect(m.serviceCount).toBe(2);
    expect(m.commissionCents).toBe(2750);
    expect(m.tipsCents).toBe(500);
    expect(m.productRevenueCents).toBe(1000);
    expect(m.totalDueCents).toBe(3250);
    expect(r.lines.find((l) => l.staffId === 'r')!.totalDueCents).toBe(180000);
    expect(r.salonShareCents).toBe(2750);
  });

  it('rounds commission to the cent and clamps bad rates', () => {
    const r = computePayroll([{ ...staff[0], commissionRate: 1.7 }], [{ staffId: 'm', kind: 'SERVICE', amountCents: 999, tipCents: 0 }]);
    expect(r.lines[0].commissionCents).toBe(999);
  });
});
