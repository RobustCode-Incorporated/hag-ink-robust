# 03 — Software requirements specification (SRS)

## Functional requirements
| ID | Requirement | Spec | Code |
|---|---|---|---|
| FR-01 | Public home in FR (default), ES, NL, EN with language switch keeping the page | 001 | `src/app/[locale]/`, `messages/` |
| FR-02 | Fixed full-screen video that advances with scroll; salon name reveals the video through its letters | 001 | `components/site/ScrollVideoBackground.tsx`, `LogoReveal.tsx` |
| FR-03 | Services, prices and durations shown from the database | 001 | `HomeClient.tsx`, `lib/booking.ts#listServices` |
| FR-04 | Client books: service → barber or "no preference" → day → free slot → name + phone (+email) → confirmation | 002 | `reserver/BookingClient.tsx`, `api/bookings` |
| FR-05 | A slot is offered only if the whole service duration fits in opening hours, outside absences and outside the barber's other appointments | 002 | `domain/slots.ts` |
| FR-06 | "No preference" assigns the free barber with the fewest bookings that day | 002 | `domain/slots.ts#pickBarber` |
| FR-07 | Two people can never get the same barber at overlapping times (even simultaneously) | 002 | `appointments_no_overlap` constraint |
| FR-08 | Client gets a private link to view, add to calendar (ICS) or cancel (until 2 h before) | 002 | `rdv/[token]`, `api/bookings/[token]/*` |
| FR-09 | Staff log in with email + password; 3 roles with server-side checks | 003 | `api/auth/*`, `lib/auth.ts`, `lib/nav.ts` |
| FR-10 | Agenda per day with one column per barber; add phone/walk-in booking; cancel, no-show, restore | 004 | `gestion/(app)/agenda` |
| FR-11 | Till: cash in an appointment, a walk-in service, or a product (stock decremented); tips; cash/card/other; void with stock and appointment restore | 004 | `gestion/(app)/caisse`, `actions.ts#recordSaleAction` |
| FR-12 | Clients created automatically (matched by phone) with visits, spend, last/next visit, no-shows | 004 | `gestion/(app)/clients` |
| FR-13 | Dashboard per period: revenue (services/products), count, average ticket, expenses, commissions, estimated result, 30-day chart, revenue per barber, today's agenda, low stock, pending expenses | 004 | `gestion/(app)/page.tsx` |
| FR-14 | Monthly payroll: commission % on service revenue or fixed salary, + 100 % tips; printable | 005 | `domain/payroll.ts`, `salaires` |
| FR-15 | Team management: role, login, pay settings, bookable, active; absences (barber or whole salon) | 003/004 | `equipe`, `actions.ts` |
| FR-16 | Expenses by category; manager submits, owner approves/rejects | 006 | `depenses` |
| FR-17 | Products: price, cost, margin, stock, low-stock alert, adjustments, 30-day sales | 006 | `produits` |
| FR-18 | Owner edits services (4 language names, price, duration, allowed days, online, active) and opening hours; public site updates | 006 | `prestations`, `reglages` |
| FR-19 | Barber space: month stats, upcoming appointments, calendar subscription link, password change | 004 | `moi`, `api/calendar/[staffId]` |
| FR-20 | Tenant configuration isolated in one file + assets, so the system can be reused for a new salon | 007 | `src/config/salon.ts`, `.claude/skills/` |

## Non-functional requirements
| ID | Requirement |
|---|---|
| NFR-01 Performance | Public pages server-rendered; home revalidated every 5 min; video ≤ 11 MB, keyframe every 6 frames for smooth scrubbing |
| NFR-02 Availability | Vercel + Neon managed; no local infrastructure |
| NFR-03 Security | see 09-security.md (JWT httpOnly cookies, bcrypt, rate limits, CSP, role checks in every action) |
| NFR-04 Privacy | GDPR: explicit consent at booking, minimal data, no marketing by default, private manage tokens, `noindex` on private pages |
| NFR-05 Correctness | money in cents; DST-safe time conversions; DB constraints for overlaps and stock ≥ requested |
| NFR-06 Accessibility | `prefers-reduced-motion` → static poster instead of video; labelled inputs; contrast on dark UI |
| NFR-07 Maintainability | pure domain functions with unit tests; one tenant file; specs before code |
| NFR-08 i18n | all public strings in `messages/*.json` with identical keys (checked) |
