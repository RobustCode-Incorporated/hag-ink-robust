import { describe, expect, it } from 'vitest';
import { allowanceBalance, canReverse, cleanScores, csvCell, latestScores, scoreOf, toCsv } from '@/domain/ambassador-program';

describe('service allowances', () => {
  const e = (id: number, kind: 'ALLOCATION' | 'CONSUMPTION' | 'EXPIRATION' | 'ADJUSTMENT' | 'REVERSAL', qty: number, reversesId: number | null = null) => ({ id, kind, qty, reversesId });
  it('recomputes the balance from the ledger', () => {
    const l = [e(1, 'ALLOCATION', 3), e(2, 'CONSUMPTION', -1), e(3, 'ADJUSTMENT', 1), e(4, 'CONSUMPTION', -1), e(5, 'REVERSAL', 1, 4)];
    // the reversed consumption (#4) leaves the 'consumed' bucket
    expect(allowanceBalance(l)).toEqual({ allocated: 3, consumed: 1, expired: 0, adjusted: 1, available: 3 });
    expect(allowanceBalance([...l, e(6, 'EXPIRATION', -3)]).available).toBe(0);
  });
  it('reverses an entry only once, never a reversal', () => {
    const l = [e(1, 'ALLOCATION', 2), e(2, 'CONSUMPTION', -1), e(3, 'REVERSAL', 1, 2)];
    expect(canReverse(l[1], l)).toBe(false);
    expect(canReverse(l[0], l)).toBe(true);
    expect(canReverse(l[2], l)).toBe(false);
  });
});

describe('scoring', () => {
  it('treats a missing criterion as unavailable, never zero', () => {
    const s = cleanScores({ audience: '20', engagement: '', content: 15, professionalism: 8 });
    expect(s.engagement).toBeNull();
    const r = scoreOf(s, 'POTENTIAL');
    expect(r.score).toBe(Math.round((43 / 55) * 1000) / 10);
    expect(r.recommendation).toBeNull();
    expect(r.missing).toEqual(['Engagement authentique']);
  });
  it('recommends only when the phase is complete', () => {
    expect(scoreOf({ audience: 25, engagement: 20, content: 18, professionalism: 9 }, 'POTENTIAL')).toMatchObject({ score: 96, recommendation: 'PARTENARIAT' });
    expect(scoreOf({ audience: 12, engagement: 12, content: 10, professionalism: 5 }, 'POTENTIAL')).toMatchObject({ score: 52, recommendation: 'PONCTUEL' });
    expect(scoreOf({ bookings: 5, professionalism: 3 }, 'PERFORMANCE')).toMatchObject({ score: 22.9, recommendation: 'NONE' });
  });
  it('refuses out of range marks', () => {
    expect(() => cleanScores({ audience: 26 })).toThrow();
    expect(() => cleanScores({ professionalism: 2.5 })).toThrow();
  });
  it('global view keeps the latest mark per criterion, counted once', () => {
    const g = latestScores([{ criteria: { audience: 10, professionalism: 5 } }, { criteria: { bookings: 20, professionalism: 9 } }]);
    expect(g).toEqual({ audience: 10, professionalism: 9, bookings: 20 });
  });
});

describe('csv', () => {
  it('escapes and neutralises formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-12.5')).toBe('-12.5');
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(toCsv(['a', 'b'], [[1, null]])).toBe('﻿a;b\r\n1;\r\n');
  });
});
