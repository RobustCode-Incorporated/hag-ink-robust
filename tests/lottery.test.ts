import { describe, expect, it } from 'vitest';
import { pickWinner, ticketNumber } from '@/domain/lottery';

describe('tombola', () => {
  it('numbers tickets per draw and avoids duplicates', () => {
    const seq = [0.1234, 0.1234, 0.5];
    const n1 = ticketNumber('2026-12-24', new Set(), () => 0.1234);
    expect(n1).toBe('HI-20261224-1234');
    expect(ticketNumber('2026-12-24', new Set([n1]), () => seq.shift()!)).toBe('HI-20261224-5000');
  });
  it('picks the winner with the given random index', () => {
    expect(pickWinner(['a', 'b', 'c'], () => 2)).toBe('c');
    expect(() => pickWinner([], () => 0)).toThrow();
    expect(() => pickWinner(['a'], () => 1)).toThrow();
  });
});
