---
name: robust-salon-system
description: Launch or extend a Robust Salon System (barber/hair/beauty/tattoo salon) — public cinematic site with multi-barber online booking in 4 languages + Robust Enterprise Management back-office (agenda, till, clients, team, payroll, expenses, stock). Use when the user wants "le système complet de gestion" for a new salon, a site + management like Latino's / Debs / Hag & Ink, or to add a feature to such a project. Follows Robust Specification Driven Development (RSDDF).
---

# Robust Salon System

Reference implementation: `~/Projects/latinos-barber-robust` (Latino's Barber Shop, live on Vercel).
Lineage: Debs Hair & Beauty (site, booking, i18n) ⊕ Hag & Ink (scroll video, CEO/manager dashboards, payroll).

## Non-negotiables
- **RSDDF**: P.R.O.J.E.C.T. gate in `docs/00-project-brief.md`, then docs 01–11 + `specs/NNN-*.md` with acceptance criteria *before* coding a feature. Template docs are in the reference repo; the framework is `RobustCode-Incorporated/Robust-Specification-Driven-Development-Framework`.
- **Branding**: public site = the salon's own identity (derive colours/fonts from its photos/Instagram); `/gestion` = Robust REM design (snow #FFFAFA, black bar + Robust logo + "Robust Enterprise Management" in Ysabeau Office, ABeeZee text, black stat cards). Footer credit "Système de gestion par Robust Code".
- **Cloud only**: new Neon project + new Vercel project per salon. No local Docker/DB. Never share a DB between clients.
- **Data truth**: real services/prices/hours/team from the salon's booking page (Planity/Treatwell/Fresha). Planity pages embed a JSON with every service (`"prices":{"default":2500}`, `duration`, `deletedAt` = removed) and `"pictures"` (Cloudinary ids → `https://res.cloudinary.com/planity/image/upload/q_auto,f_jpg/<id>`).
- Instagram blocks automated scraping: don't work around it; ask the salon for photos or use public listing photos.

## Launch a new salon (≈ half a day)
1. **Copy** the reference repo without `.git`, `node_modules`, `.next`, `.env*`, `.vercel`; `git init -b main`.
   `npm install --ignore-scripts` (esbuild postinstall fails on this Mac; Vercel installs normally).
2. **Discovery**: fetch the booking page; record services (name, duration, price, allowed days), hours, collaborators, rating, address/geo. Fill `docs/00`, `01`, `decisions.md` (open questions: commission rates, phone, legal identity, domain).
3. **Neon**: `mcp__Neon__create_project` (org RobustCode `org-flat-king-04621029`, region `aws-eu-central-1`, pg 17, database named after the salon) → `get_connection_string` → `.env` `DATABASE_URL` (use `sslmode=verify-full`, drop `channel_binding`). `AUTH_JWT_SECRET=$(openssl rand -hex 32)`.
4. **Tenant edit** (only these): `src/config/salon.ts` (everything business), `messages/{fr,es,nl,en}.json` (hero/chapters copy; keep identical keys — check script in README), public tokens in `src/app/globals.css`, fonts in `src/app/[locale]/layout.tsx`, `public/salon/*`.
5. **Video**: run the `scroll-video-background` skill (shots JSON → `npm run video:build`), report `INTRO_SHARE`.
6. **DB**: `npm run db:migrate && npm run db:seed` → note the printed owner password (shown once).
7. **Gate**: `npm run typecheck && npm run lint && npm test && npm run build`, then local `next start` smoke test (availability, booking 201 then 409 on same slot, cancel, login, every `/gestion/*` page 200) and a Playwright pass with screenshots (desktop + 390 px mobile). Use `waitUntil: 'load'` (video keeps network busy) and target flash messages with `p[role=status]` (Next's route announcer also has role=alert). Don't click "first form button" — the nav logout is a form.
8. **Vercel**: commit `vercel.json` with `"framework": "nextjs"` and a `.vercelignore` containing `.env*` **before** the first deploy (a project created by `vercel project add` defaults to preset "Other" → every route 404). `vercel project add <name> --scope robust-codes-projects`, `vercel link`, `vercel env add DATABASE_URL|AUTH_JWT_SECRET production+preview`, `NEXT_PUBLIC_SITE_URL production`, `vercel deploy --prod`. Alias may 404 for ~1 min after deploy.
9. **Handover**: owner login, how to add barbers/logins, calendar-feed links, open questions. GitHub repo only if the user asks.

## Adding a feature
Write `specs/NNN-name.md` (goal, rules, acceptance criteria) → update SRS row + affected docs → pure rule in `src/domain/` with tests → server action in `src/app/gestion/actions.ts` (always `requireRole`, validate, audit money/team changes) → page with `components/gestion/ui.tsx` primitives → gate → deploy.

## Architecture cheat-sheet
- Next.js 16: `src/proxy.ts` (not middleware), async `params/searchParams/cookies`. Two root layouts: `app/[locale]/layout.tsx` (public, next-intl) and `app/gestion/layout.tsx` (REM). Guard `hasLocale` in locale pages (unknown paths hit `[locale]`).
- Booking engine `src/domain/slots.ts` + `src/lib/booking.ts`; DB `EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at) WITH &&)` is the real guard (needs `btree_gist`).
- Till (`sales`) is the only revenue source; payroll = commission on services + fixed + 100 % tips.
- Times: `src/lib/timezone.ts` (`salonToUtc`, `salonTime`, `salonDate`) — never naive `new Date("…T11:00")`.
