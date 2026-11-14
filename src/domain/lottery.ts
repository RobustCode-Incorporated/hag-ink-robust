// Tombola rules (pure). Spec: specs/009-tombola.md.

/** Ticket number: HI-<draw yyyymmdd>-<4 digits>, unique per draw. */
export function ticketNumber(drawDate: string, existing: Set<string>, rand: () => number): string {
  const prefix = `HI-${drawDate.replaceAll('-', '')}-`;
  for (let i = 0; i < 50; i++) {
    const n = `${prefix}${String(Math.floor(rand() * 10000)).padStart(4, '0')}`;
    if (!existing.has(n)) return n;
  }
  throw new Error('No free ticket number for this draw');
}

/** Picks the winner uniformly. randInt(n) must return an integer in [0, n). */
export function pickWinner<T>(tickets: T[], randInt: (n: number) => number): T {
  if (tickets.length === 0) throw new Error('No ticket for this draw');
  const i = randInt(tickets.length);
  if (!Number.isInteger(i) || i < 0 || i >= tickets.length) throw new Error('Bad random index');
  return tickets[i];
}
