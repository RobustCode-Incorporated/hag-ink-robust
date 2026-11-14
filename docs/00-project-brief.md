# 00 — Project brief

| | |
|---|---|
| Client | Latino's Barber Shop — 33 Rue Ernest Allard, 1000 Bruxelles (Sablon) |
| Sources | Planity listing (services, prices, hours, 9 collaborators, 4.5/5 · 95 reviews), Instagram @machiner_4k |
| Supplier | Robust Code (Robust Enterprise Management) |
| Date | 2026-10-30 |
| Product | Robust Salon System = Debs Hair & Beauty (site + booking) ⊕ Hag & Ink (management + scroll video) |

## P.R.O.J.E.C.T. gate

**P — Problem.** The salon depends on Planity for bookings (commission/visibility owned by a third party),
has no website of its own, and runs the till, barber commissions, expenses and stock without one
source of truth. With 9 barbers sharing chairs, nobody can answer "what did we earn this month, and
what do we owe each barber?" quickly and reliably.

**R — Result.** (1) A brand website that converts visitors into bookings without a third party,
(2) every euro entering the till recorded with its barber, (3) monthly pay per barber computed
automatically, (4) the owner sees revenue, costs and estimated profit for any period in < 10 seconds.

**O — Owner.** Business owner: salon owner (Direction). Workflow owner: salon manager (daily agenda + till).
Executing agents: the system (booking engine, payroll calculator); Robust Code maintains it.

**J — Job.** Public site (4 languages) → online booking per barber → agenda → cash-in at the till
(service / walk-in / product) → payroll, dashboard, expenses, stock. Out of scope v1: online payment,
SMS reminders, loyalty/membership, accounting export, multi-salon.

**E — Economics.** Infra: Vercel Hobby/Pro + Neon free/launch tier (≈ €0–25/month). Email optional (Resend, free tier).
Value: removes booking-platform dependency, saves end-of-month payroll work (~2–4 h/month), reduces till errors.

**C — Constraints & risks.** GDPR (client phone/email = personal data; consent at booking, no marketing by default).
Single timezone Europe/Brussels. Payment on site (as on Planity today). Real commission rates and the
salon's phone number are unknown (see decisions.md). Must keep Robust branding on the management side.

**T — Trigger.** Client books online (event) · staff opens the agenda each morning (schedule) · each sale at
the till (event) · end of month payroll (schedule, 1st of month) · owner review (weekly).

**Approval.** Human approval required before go-live: owner validates prices, hours, team list, commission
rates and legal texts (decisions.md).
