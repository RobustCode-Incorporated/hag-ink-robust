# Spec 010 - UGC / ambassador program (from Debs Hair & Beauty)

Source: `~/Projects/Debshairbeauty/docs/AMBASSADRICES.md` (+ 1,258-line specification).
Owner request 2026-11-02: "the same as Debs" for Hag & Ink. Principle kept: **extend, do not
duplicate** (one booking flow, one service catalogue, one client table).

## What changes from Debs

| Debs | Hag & Ink (REM) |
|---|---|
| Online payment (Stripe), discount applied at checkout | Pay at the shop (cash, Mobile Money): discount applied **at the till** (`/gestion/caisse`) on a booked appointment carrying the code |
| Ambassadrices (women's salon) | Ambassadeurs / créateurs (barber, locks, tattoo) — neutral wording |
| Separate admin token + roles | REM roles: OWNER = everything, MANAGER = marketing + till, BARBER = nothing |
| € | $ (SALON.currency); sharing mostly via WhatsApp / Instagram / TikTok |

## Phases

1. **Application + creators**: public page `/[locale]/ambassadeurs` (+ form, rate limit, RGPD consent),
   owner review in `/gestion/ambassadeurs`, creator record (slug, socials, status).
2. **Attribution**: personal link `/[locale]/experience/<slug>` (visit counted without cookie/IP,
   bots excluded) → booking carries `referral_slug`; personal promo code (`PRENOM10`), validated server side;
   new vs returning client; attribution written once, corrections by superseding row + audit.
3. **Till integration**: when the attributed appointment is paid, the discount is applied from the
   DB (never from the browser); usage limits under row lock.
4. **Service allowances** (free services for creators): proposed → approved by the owner; immutable
   ledger (allocation, hold, consumption, expiry, reversal); balances always recomputed.
5. **Deliverables + scoring**: content to deliver per campaign, review, scoring /100 with "unavailable"
   criteria (never zero), history immutable.
6. **Dashboard**: visits → bookings → completed, revenue of completed attributed services,
   cost of discounts and allowances (owner only), CSV export.
7. **Creator portal**: secret link (hash stored only, in URL fragment) → own stats, own code, own deliverables.

## Acceptance (phase 1-3 = MVP)

- A creator link visit + booking + paid service shows as 1 attributed acquisition in the dashboard.
- The same promo code used twice concurrently on its last use: one succeeds.
- A client who already came is counted as booking, not acquisition.
- Creators never see client identities or internal costs.

Status: phases 1-7 built and tested end to end on 2026-11-02 (see below).

## Built 2026-11-02 (phases 1-3)

- Tables: ambassador_applications, ambassadors, promo_codes, referral_visits, booking_attributions, promo_redemptions.
- Rules `src/domain/ambassadors.ts` (+ tests): slug/code generation, server-side code check, discount,
  Debs attribution policy, bot filter.
- Public: `/ambassadeurs` (application, honeypot, consent, 5/h per pseudonymised IP), `/experience/<slug>`
  (visit counted without personal data, CTA to `/reserver?ref=<slug>`), promo field in booking.
- Booking: attribution written in the booking transaction; creator's own booking not attributed;
  new client = no previous sale nor completed appointment.
- Till: code re-checked and discount applied from the DB under row lock; redemption recorded once per
  appointment; `uses <= max_uses` also enforced by a DB CHECK.
- `/gestion/ambassadeurs` (OWNER, MANAGER): applications, creators, code settings, pause, metrics
  (discount cost visible to OWNER only).

## Built 2026-11-02 (phases 4-7)

- **4. Allowances**: `service_allowances` (proposed by OWNER/MANAGER, approved or rejected by the OWNER only),
  `allowance_ledger` append-only (DB trigger refuses UPDATE/DELETE), unique idempotency key per write.
  Balance = sum of the ledger (`allowanceBalance`). Used at the till by the creator only (phone match),
  for the right service, before expiry, inside the sale transaction (sale amount 0). Owner can adjust (±, reason),
  reverse one entry once (`canReverse`), expire the remaining balance.
- **5. Deliverables + scoring**: deliverables requested in management, link submitted from the portal (https only),
  validated/refused with a note. `score_assessments` append-only; criteria Debs (25/20/20/25/10); empty = not
  assessed, never zero; recommendation only when the phase is complete; override needs a reason; global view =
  latest mark per criterion.
- **6. CSV**: `/api/gestion/ambassadeurs/export?type=ambassadors|bookings` (OWNER, MANAGER), `;` separator, BOM,
  formula injection neutralised, no client identity, discount columns OWNER only, audited.
- **7. Portal**: `/ambassadeurs/portail/acces#t=<secret>` (secret in the URL fragment, only SHA-256 stored) →
  30-day httpOnly SameSite=Strict session (hashed in DB) → `/ambassadeurs/portail`: own numbers, link, code,
  allowances, deliverables. New link revokes the old one and its sessions. Mutations require same Origin; 10 tries / 15 min.
