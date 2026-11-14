import { describe, expect, it } from 'vitest';
import { findPlan, flexpayPhone, membershipEnd, paymentReference, PLANS } from '@/domain/memberships';

describe('packs FlexPay', () => {
  it('keeps the prices of the previous site', () => {
    expect(PLANS.map((p) => [p.code, p.priceCents / 100])).toEqual([
      ['STANDARD_ENFANT', 49], ['STANDARD_ADULTE', 89], ['BRAIDS_A', 89], ['BRAIDS_B', 189],
      ['LOCKS_A', 209], ['LOCKS_B', 329], ['LIMITED_EDITION', 229],
    ]);
    expect(findPlan('LIMITED_EDITION')?.tickets).toBe(2);
    expect(findPlan('NOPE')).toBeNull();
  });
  it('normalises DRC phones for Mobile Money', () => {
    expect(flexpayPhone('+243 841 938 211')).toBe('243841938211');
    expect(flexpayPhone('0841938211')).toBe('243841938211');
    expect(flexpayPhone('00243841938211')).toBe('243841938211');
    expect(flexpayPhone('841938211')).toBe('243841938211');
    expect(flexpayPhone('+32470123456')).toBeNull();
  });
  it('computes the end date and a short reference', () => {
    expect(membershipEnd(new Date('2026-01-15T10:00:00Z'), 1).toISOString()).toBe('2026-02-15T10:00:00.000Z');
    const ref = paymentReference(1_700_000_000_000, () => 0.5);
    expect(ref.startsWith('HAG')).toBe(true);
    expect(ref.length).toBeLessThanOrEqual(50);
  });
});
