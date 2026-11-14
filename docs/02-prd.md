# 02 — Product requirements (PRD)

## Personas
| Persona | Need | Uses |
|---|---|---|
| **Client** (Kevin, 24, student) | book his barber in 30 s from Instagram, in his language | `/`, `/reserver`, `/rdv/[token]` |
| **Owner / Direction** | know revenue, profit, what each barber earns; set prices & hours | dashboard, salaires, prestations, réglages, dépenses (approve) |
| **Manager / reception** | run the day: agenda, phone bookings, walk-ins, till, stock | agenda, caisse, clients, produits, dépenses |
| **Barber** (Machiner 4K) | see his appointments, on his phone; know his month earnings | mon espace, agenda (own), calendar feed |

## Goals & KPIs
| Goal | KPI | Target (3 months) |
|---|---|---|
| Own bookings | % appointments with source ONLINE | ≥ 40 % |
| Reliable revenue data | % of services recorded via till | 100 % |
| Fewer no-shows | no-show rate | < 5 % |
| Fast payroll | time to produce month pay | < 5 min |
| Site quality | Lighthouse perf/SEO/a11y | ≥ 90 |

## Scope v1 (delivered)
Public cinematic site (scroll-driven video + logo reveal) · 4 languages · services & prices · team ·
hours/map · booking by barber or "first available" · manage/cancel link + ICS · management login with
3 roles · dashboard · agenda (day × barber) · phone/walk-in bookings · till (appointment, walk-in, product,
void) · clients · team & access & absences · payroll · expenses with approval · products & stock ·
service catalogue editor (4 languages) · opening hours editor · barber space · per-barber calendar feed.

## Later (v2 backlog, need a new spec each)
Stripe deposit for no-show-prone clients · SMS/WhatsApp reminders · review request after visit ·
loyalty (10th cut free) · gift vouchers · Instagram feed on site (official API) · CSV/accounting export ·
per-barber working hours · multi-salon · ROBUST IA insights (forecast, retention alerts).
