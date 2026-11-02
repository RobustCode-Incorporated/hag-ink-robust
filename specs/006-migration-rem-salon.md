# Specification 006 - Migration to Robust Enterprise Management, Salon Edition

## Goal

Move Hag & Ink (Kinshasa, live since 2026) from this codebase to the REM Salon Edition
(reference: `latinos-barber-robust`) without losing any data, then add JOHN (Robust SI) there.
Same stack versions (Next 16.2.10, React 19.2.4, Tailwind 4): this is a product upgrade
(design REM, agenda, till, clients, team, payroll, expenses, products, settings, 4-language site),
not a stack rescue.

## Data inventory (production, read-only count, 2026-11-02)

| Hag & Ink table | Rows | Goes to (REM) | Rule |
|---|---|---|---|
| Barber | 5 | `staff` (BARBER, COMMISSION, same rate) | Bilal 30 %, others 25 % (REM default 50 % must NOT apply) |
| User (CEO, MANAGER) | 2 | `staff` OWNER + MANAGER | same e-mails; new passwords given once (no hash reuse) |
| Service (executed, amount only) | 2,402 | `sales` kind SERVICE, `created_at` kept | one catalogue line "Prestation (historique Hag & Ink)", offline, inactive |
| Expense | 16 | `expenses`, status PENDING, category AUTRE, `spent_on` = created date | none validated today |
| Client | 1 | `clients` | |
| Plan | 7 | **gap**: REM has no subscriptions | see decision D-2 |
| Payment (FlexPay) | 1 | **gap** | archive as JSON + keep old DB read-only |
| LotteryTicket | 0 | **gap**: REM has no tombola | see decision D-3 |
| Product, Appointment, Invoice | 0 | none | |

Money: REM stores cents (`integer`), Hag & Ink stores floats in USD. Convert with `Math.round(x * 100)`
and check totals per month before/after (must be equal to the cent).

## Tenant settings

`currency: 'USD'`, `timezone: 'Africa/Kinshasa'`, address 2 Avenue Colonel Lukusa, Gombe, Kinshasa,
logo and scroll video already exist in this repo (`public/`, `ScrollVideoBackground`).

## Plan

1. New repo `hag-ink-rem` from the REM template; `salon.ts` for Hag & Ink; USD + Kinshasa.
2. New Neon project in the Hag-Ink org (never share a DB) + schema.
3. `scripts/import-hag-ink.ts`: reads the old DB (read-only role), writes the new one,
   idempotent (keeps old ids in a `legacy_id` column), prints a reconciliation table
   (rows + totals per month, old vs new).
4. JOHN adapter in the REM codebase (facts from `sales` + `expenses`), same worker.
5. Gate (typecheck, lint, tests, build, smoke, Playwright) + new Vercel project on a preview URL.
6. Owner review, then cut-over: freeze old app (read-only), final import, switch www.hag-ink.com,
   keep the old project and DB untouched 30 days.

## Decisions needed (owner)

- D-1 Service menu and prices for the public site and online booking (none exists in the data).
- D-2 Monthly plans (STANDARD, BRAIDS, LOCKS, LIMITED_EDITION) and FlexPay: keep as a REM module, or drop?
- D-3 Tombola: keep (0 tickets so far) or drop?
- D-4 Cut-over date and who tells the team (new logins).

## Acceptance criteria

1. Reconciliation: same number of sales and same revenue per month, to the cent, old vs new.
2. Payroll in REM for October 2026 equals the old treasury page (4,159.50 USD commissions).
3. The old system stays reachable and unchanged until the owner signs off.
4. JOHN's October report from REM matches the one produced from the old system.
