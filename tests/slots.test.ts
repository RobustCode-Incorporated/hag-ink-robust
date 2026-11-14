import { describe, expect, it } from 'vitest';
import { computeSlots, pickBarber } from '@/domain/slots';

const H = 3_600_000;
const M = 60_000;
const base = Date.UTC(2026, 10, 3, 10); // 11:00 Brussels (winter)
const open = { start: base, end: base + 8 * H };

describe('computeSlots', () => {
  it('returns nothing when the salon is closed', () => {
    expect(computeSlots({ open: null, durationMin: 30, stepMin: 15, notBefore: 0, salonClosed: [], barbers: [{ staffId: 'a', busy: [] }] })).toEqual([]);
  });

  it('never proposes a slot that would end after closing', () => {
    const slots = computeSlots({ open, durationMin: 30, stepMin: 15, notBefore: 0, salonClosed: [], barbers: [{ staffId: 'a', busy: [] }] });
    expect(slots.at(-1)!.start).toBe(open.end - 30 * M);
    expect(slots).toHaveLength((8 * 60 - 30) / 15 + 1);
  });

  it('respects appointment duration, not only exact start times', () => {
    const busy = [{ start: base + 30 * M, end: base + 60 * M }];
    const slots = computeSlots({ open, durationMin: 30, stepMin: 15, notBefore: 0, salonClosed: [], barbers: [{ staffId: 'a', busy }] });
    const starts = slots.map((s) => (s.start - base) / M);
    expect(starts).toContain(0);
    expect(starts).not.toContain(15); // 11:15–11:45 overlaps 11:30
    expect(starts).not.toContain(30);
    expect(starts).not.toContain(45);
    expect(starts).toContain(60);
  });

  it('keeps a slot open while another barber is free', () => {
    const slots = computeSlots({
      open, durationMin: 30, stepMin: 15, notBefore: 0, salonClosed: [],
      barbers: [{ staffId: 'a', busy: [{ start: base, end: base + H }] }, { staffId: 'b', busy: [] }],
    });
    expect(slots[0]).toEqual({ start: base, staffIds: ['b'] });
  });

  it('hides past slots and salon closures', () => {
    const slots = computeSlots({
      open, durationMin: 15, stepMin: 15, notBefore: base + 2 * H,
      salonClosed: [{ start: base + 3 * H, end: base + 4 * H }],
      barbers: [{ staffId: 'a', busy: [] }],
    });
    const starts = slots.map((s) => (s.start - base) / H);
    expect(Math.min(...starts)).toBe(2);
    expect(starts.some((h) => h >= 3 && h < 4)).toBe(false);
  });
});

describe('pickBarber', () => {
  it('chooses the least-loaded free barber, ties keep order', () => {
    expect(pickBarber(['a', 'b', 'c'], { a: 3, b: 1, c: 1 })).toBe('b');
    expect(pickBarber([], {})).toBeNull();
  });
});
