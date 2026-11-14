# Spec 002 — Online booking (multi-barber, duration-aware)

**Goal.** A client books a precise service with a chosen barber (or the first free one) in < 30 s, without double bookings.
**Upgrade over Debs:** per-barber calendars and duration overlap (Debs: single stylist, exact start time only).

## Rules
- Slot step 15 min; a slot exists if `[start, start+duration)` ⊂ opening hours, starts ≥ now + 30 min, ≤ 30 days ahead,
  doesn't overlap a salon closure, and at least one bookable barber has no overlapping appointment/absence.
- Service `allowed_days` restricts days (student offer Mon–Thu).
- "Peu importe" → free barber with fewest appointments that day (ties: team order).
- Price = catalogue price at booking time; payment on site.
- Client matched/created by normalised phone; max 3 upcoming bookings per phone.
- Manage link `/rdv/{token}`: details, ICS download, cancel until 2 h before.

## Acceptance criteria
1. A 30-min service never ends after closing; a booked 11:30–12:00 blocks 11:15, 11:30, 11:45 starts for that barber only. *(tests/slots.test.ts)*
2. Two simultaneous requests for the same barber & overlapping time → one 201, one 409 SLOT_TAKEN. *(DB constraint; smoke test)*
3. Times are stored in UTC and displayed in Brussels time, including DST switch days. *(tests/lib.test.ts)*
4. Cancelling within 2 h returns TOO_LATE; otherwise the slot becomes free again.
5. Missing consent → 400 CONSENT; honeypot filled → 400.
