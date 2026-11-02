import { describe, expect, it } from 'vitest';
import { buildMonthlyFacts, monthKeyShift } from './monthly-facts';

const business = { name: 'Test', sector: 'salon', currency: 'USD', locale: 'fr-CD' };
const barbers = [
  { id: 'a', firstName: 'Ana', lastName: '', salaryType: 'COMMISSION', fixedSalary: 0, commissionRate: 0.3 },
  { id: 'b', firstName: 'Ben', lastName: '', salaryType: 'COMMISSION', fixedSalary: 0, commissionRate: 0.25 },
];
const d = (s: string) => new Date(`${s}T10:00:00Z`);

describe('buildMonthlyFacts', () => {
  const services = [
    ...Array.from({ length: 9 }, () => ({ barberId: 'a', amount: 100, createdAt: d('2026-10-05') })),
    { barberId: 'b', amount: 50, createdAt: d('2026-10-06') },
    { barberId: 'a', amount: 400, createdAt: d('2026-09-10') },
    { barberId: 'b', amount: 400, createdAt: d('2026-09-11') },
    { barberId: 'a', amount: 999, createdAt: d('2026-11-01') }, // next month: ignored
  ];
  const expenses = [
    { amount: 20, description: 'Pressing', isValidated: false, createdAt: d('2026-08-06') },
    { amount: 300, description: 'Groupe & Frigo', isValidated: false, createdAt: d('2026-10-30') },
    { amount: 40, description: 'Wifi', isValidated: true, createdAt: d('2026-10-09') },
  ];
  const f = buildMonthlyFacts({ periodKey: '2026-10', business, barbers, services, expenses, now: d('2026-11-02') });

  it('computes headline numbers for the month only', () => {
    expect(f.headline[0]).toMatchObject({ id: 'revenue', value: 950, previous: 800, changePct: 18.8 });
    expect(f.headline[1]).toMatchObject({ id: 'services', value: 10, previous: 2 });
    expect(f.headline[2]).toMatchObject({ id: 'avg_ticket', value: 95, previous: 400 });
    // commissions: 900 * 0.3 + 50 * 0.25
    expect(f.headline[3]).toMatchObject({ id: 'payroll', value: 282.5 });
  });

  it('balance = revenue - payroll - validated expenses of the month', () => {
    expect(f.result.value).toBe(950 - 282.5 - 40);
  });

  it('trend has 6 months ending on the period', () => {
    expect(f.trend.points.map((p) => p.label)).toEqual(['mai', 'juin', 'juillet', 'août', 'septembre', 'octobre']);
    expect(f.trend.points.at(-1)?.value).toBe(950);
  });

  it('ranks pending expenses first, including older months', () => {
    expect(f.alerts[0].text).toContain('2 dépenses attendent une validation, pour 320 dollars');
    expect(f.alerts[0].text).toContain('6 août');
    expect(f.actions[0]).toMatchObject({ priority: 1, amount: 320 });
  });

  it('flags a barber far below the team', () => {
    expect(f.actions.some((a) => a.title.includes('Ben'))).toBe(true);
  });

  it('shifts month keys across years', () => {
    expect(monthKeyShift('2026-01', -1)).toBe('2025-12');
    expect(monthKeyShift('2025-12', 1)).toBe('2026-01');
  });
});

describe('deLabel', () => {
  it('elides before a vowel', async () => {
    const { deLabel } = await import('./monthly-facts');
    expect(deLabel('octobre 2026')).toBe("d'octobre 2026");
    expect(deLabel('août 2026')).toBe("d'août 2026");
    expect(deLabel('mai 2026')).toBe('de mai 2026');
  });
});

describe('language-neutral codes', () => {
  it('gives every alert and action a code and params', () => {
    const f = buildMonthlyFacts({
      periodKey: '2026-10', business, barbers, language: 'en',
      services: [{ barberId: 'a', amount: 100, createdAt: d('2026-10-05') }],
      expenses: [{ amount: 20, description: 'Wifi', isValidated: false, createdAt: d('2026-10-06') }],
    });
    expect(f.language).toBe('en');
    expect(f.alerts.map((a) => a.code)).toContain('expenses_pending');
    expect(f.actions[0]).toMatchObject({ code: 'validate_expenses', params: { count: 1, total: 20 } });
    expect(f.actions.find((a) => a.code === 'pay_commissions')?.params).toEqual({ period: '2026-10', total: 30 });
  });
});
