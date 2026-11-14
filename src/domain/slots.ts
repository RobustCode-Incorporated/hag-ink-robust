// Availability engine (pure, no I/O). Spec: specs/002-online-booking.md
// Upgrade over the Debs template: duration-aware overlaps and one calendar per barber.

export type Interval = { start: number; end: number }; // epoch ms, [start, end)

export type BarberDay = {
  staffId: string;
  /** Live appointments (BOOKED/COMPLETED) and personal time off, as busy intervals. */
  busy: Interval[];
};

export type SlotQuery = {
  /** Salon opening for the day as UTC epoch ms, or null when closed. */
  open: Interval | null;
  durationMin: number;
  stepMin: number;
  /** Earliest bookable instant (now + lead time). */
  notBefore: number;
  /** Salon-wide closures (staff_id NULL time off). */
  salonClosed: Interval[];
  barbers: BarberDay[];
};

export type Slot = { start: number; staffIds: string[] };

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Every start time in the day where at least one barber is free for the whole duration. */
export function computeSlots(q: SlotQuery): Slot[] {
  if (!q.open || q.durationMin <= 0 || q.stepMin <= 0) return [];
  const dur = q.durationMin * 60_000;
  const step = q.stepMin * 60_000;
  const slots: Slot[] = [];
  for (let start = q.open.start; start + dur <= q.open.end; start += step) {
    if (start < q.notBefore) continue;
    const candidate = { start, end: start + dur };
    if (q.salonClosed.some((c) => overlaps(c, candidate))) continue;
    const free = q.barbers
      .filter((b) => !b.busy.some((i) => overlaps(i, candidate)))
      .map((b) => b.staffId);
    if (free.length) slots.push({ start, staffIds: free });
  }
  return slots;
}

/**
 * "Peu importe" choice: give the slot to the free barber with the fewest
 * bookings that day, so the work is shared fairly. Ties keep team order.
 */
export function pickBarber(freeStaffIds: string[], loadByStaff: Record<string, number>): string | null {
  let best: string | null = null;
  for (const id of freeStaffIds) {
    if (best === null || (loadByStaff[id] ?? 0) < (loadByStaff[best] ?? 0)) best = id;
  }
  return best;
}
