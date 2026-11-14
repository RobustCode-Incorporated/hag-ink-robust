# 04 — Domain model

```
Staff (OWNER | MANAGER | BARBER) ──< Appointment >── Client
  │  pay: COMMISSION(rate) | FIXED(salary)      │
  │                                             └── Service (price, duration, allowed days)
  ├──< TimeOff (staff or whole salon)
  └──< Sale (SERVICE | PRODUCT, amount, tip, method) >── Product (stock)
                     └── optional → Appointment (cashing in completes it)
Expense (PENDING → APPROVED | REJECTED, decided by OWNER)
OpeningHours (weekday → opens/closes | closed)
AuditLog (actor, action, entity)
```

## Ubiquitous language (FR in UI)
| Term | Meaning |
|---|---|
| Prestation | a catalogue service (Coupe, Contours…) |
| Créneau | a start time where the full duration fits for at least one barber |
| Rendez-vous | an appointment: BOOKED → COMPLETED (cashed) / CANCELLED / NO_SHOW |
| Caisse / encaisser | recording a Sale — the **only** source of revenue figures |
| Commission | `rate × service revenue` of a barber over a period |
| Absence | TimeOff blocking slots for one barber or the whole salon |

## Invariants
1. A barber has no overlapping live (BOOKED/COMPLETED) appointments — enforced by DB exclusion constraint.
2. An appointment is cashed at most once (`sales.appointment_id UNIQUE`); voiding restores BOOKED.
3. Product stock never goes below zero through a sale (conditional update).
4. Prices charged online come from `services.price_cents`; staff may override at the till (recorded amount wins).
5. Revenue, payroll and dashboard read only non-voided `sales`.
