# Spec 004 — Agenda, till (caisse), clients, dashboard

**Goal.** Run the day and make the till the single source of revenue (ADR-005).

## Agenda
Day view, one column per bookable barber, absences hatched, appointment blocks by status
(BOOKED black, COMPLETED green, NO_SHOW red). Actions: Encaisser (→ till pre-selected), Absent, Annuler, Rétablir.
Add booking (phone / walk-in), price override allowed, same overlap rules as online but lead time ignored.

## Till
1. Cash in an appointment (amount editable, tip, method) → appointment COMPLETED + sale.
2. Walk-in service (barber, service, optional client phone).
3. Product sale (qty, seller) → stock − qty, refused if insufficient.
4. Void → sale marked voided; product stock restored; appointment back to BOOKED.
Day totals: all, cash (drawer check), card, other.

## Acceptance criteria
1. An appointment can't be cashed twice (unique constraint / conditional update).
2. Voiding a 2× product sale restores 2 units. *(browser test: stock 12 → 10 → 12 → 10)*
3. Dashboard revenue = sum of non-voided sales for the period; per-barber bars and 30-day chart agree with the till.
4. Clients page shows visits, spend, last/next visit and no-shows per phone number.
