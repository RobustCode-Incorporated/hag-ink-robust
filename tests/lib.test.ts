import { describe, expect, it } from 'vitest';
import { salonToUtc, salonTime, salonDate, weekdayOf, addDays } from '@/lib/timezone';
import { normalizePhone, parseEurosToCents } from '@/lib/format';

describe('timezone (Africa/Kinshasa, UTC+1 all year)', () => {
  it('converts wall-clock times the same in winter and summer', () => {
    expect(salonToUtc('2026-11-03', '11:00').toISOString()).toBe('2026-11-03T10:00:00.000Z');
    expect(salonToUtc('2026-07-03', '11:00').toISOString()).toBe('2026-07-03T10:00:00.000Z');
  });
  it('has no DST switch (European switch days unchanged)', () => {
    expect(salonToUtc('2026-03-29', '13:00').toISOString()).toBe('2026-03-29T12:00:00.000Z');
    expect(salonToUtc('2026-10-25', '13:00').toISOString()).toBe('2026-10-25T12:00:00.000Z');
  });
  it('round-trips', () => {
    const d = salonToUtc('2026-12-31', '18:45');
    expect(salonTime(d)).toBe('18:45');
    expect(salonDate(d)).toBe('2026-12-31');
  });
  it('computes weekdays and adds days', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('format', () => {
  it('normalises Congolese phone numbers (+243)', () => {
    expect(normalizePhone('0841 93 82 11')).toBe('+243841938211');
    expect(normalizePhone('00243 841/93.82.11')).toBe('+243841938211');
    expect(normalizePhone('+593 99 123 4567')).toBe('+593991234567');
    expect(normalizePhone('abc')).toBeNull();
  });
  it('parses euro amounts', () => {
    expect(parseEurosToCents('25,50')).toBe(2550);
    expect(parseEurosToCents('-3')).toBeNull();
  });
});
