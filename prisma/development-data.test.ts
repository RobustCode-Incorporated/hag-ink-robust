import { describe, expect, it } from 'vitest';
import {
  DEVELOPMENT_BARBERS,
  DEVELOPMENT_CLIENT,
  DEVELOPMENT_EXPENSES,
  DEVELOPMENT_PLANS,
  DEVELOPMENT_SERVICES,
} from './development-data';
import { PLAN_REGISTRY } from '../src/domains/subscription/subscribe';

describe('development seed fixtures', () => {
  it('mirrors every approved membership plan', () => {
    expect(DEVELOPMENT_PLANS).toHaveLength(Object.keys(PLAN_REGISTRY).length);

    for (const plan of DEVELOPMENT_PLANS) {
      expect(PLAN_REGISTRY[plan.name]).toMatchObject({
        price: plan.price,
        durationDays: plan.durationDays,
      });
    }
  });

  it('uses the client ID exposed by the plan integration screen', () => {
    expect(DEVELOPMENT_CLIENT.id).toBe('robust-client-test-id-2026');
  });

  it('links all dashboard services to seeded barbers and uses stable IDs', () => {
    const barberIds = new Set(DEVELOPMENT_BARBERS.map((barber) => barber.id));
    expect(new Set(DEVELOPMENT_SERVICES.map((service) => service.id)).size)
      .toBe(DEVELOPMENT_SERVICES.length);
    expect(new Set(DEVELOPMENT_EXPENSES.map((expense) => expense.id)).size)
      .toBe(DEVELOPMENT_EXPENSES.length);

    for (const service of DEVELOPMENT_SERVICES) {
      expect(barberIds.has(service.barberId)).toBe(true);
    }
  });
});
