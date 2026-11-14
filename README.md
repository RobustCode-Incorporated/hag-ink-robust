# Hag & Ink — Robust Salon System (Salon Edition)

Plateforme complète pour **Hag & Ink Barber & Tattoo** (2 Avenue Colonel Lukusa, Gombe, Kinshasa) :
site public cinématique avec réservation en ligne en 4 langues, et espace de gestion complet
(agenda, caisse, clients, équipe, salaires, dépenses, stock, catalogue, tombola, ambassadeurs, Robust SI / John)
sous la marque Robust Enterprise Management. Même configuration que les autres projets « édition salon ».

Construit avec **Robust Specification Driven Development** — voir [docs/](docs/) et [specs/](specs/).

## Live
- Site : https://www.hag-ink.com (FR · `/es` · `/nl` · `/en`)
- Gestion : https://www.hag-ink.com/gestion (les anciennes adresses `/login`, `/ceo`, `/manager` redirigent ici)
- Hébergement : projet Vercel `hag-ink-robust` (team robust-codes-projects) · Neon `hag-ink-rem` (`tiny-sea-73019063`, Frankfurt), base `hagink`
- Ancienne base Prisma (lecture seule, source de l'import) : Neon `wild-bread-09749515`, base `neondb`

## Migration depuis l'ancien Hag & Ink
`OLD_DATABASE_URL=<ancienne> DATABASE_URL=<nouvelle> npm run db:import:hag-ink -- --dry-run` puis sans `--dry-run`.
Idempotent (relançable), tout-ou-rien, rapprochement mois par mois. Les comptes CEO et Manager
gardent leurs mots de passe (les hash bcrypt sont recopiés).

## Stack
Next.js 16 (App Router, Server Actions) · React 19 · Tailwind 4 · Framer Motion · next-intl ·
PostgreSQL on Neon via `pg` (no ORM) · jose (JWT sessions) · bcryptjs · Vitest.

## Run
```bash
npm install --ignore-scripts   # esbuild's postinstall fails on this Mac; not needed
cp .env.example .env           # fill DATABASE_URL + AUTH_JWT_SECRET
npm run db:migrate             # idempotent schema (database/schema.sql)
npm run db:seed                # catalogue, hours, team, owner login (printed once)
npm run db:seed:demo           # optional: 1 month of demo activity + manager/barber test logins (additive, runs once)
npm run dev
```
Quality gate: `npm run typecheck && npm run lint && npm test && npm run build`.

## Map
```
src/config/salon.ts        ← the only tenant file (name, address, hours, booking rules, seed data)
src/domain/                ← pure business rules (slots, payroll) + tests/
src/lib/                   ← db, auth/session, booking service, timezone, ics, email
src/app/[locale]/          ← public site: home, /reserver, /rdv/[token]
src/app/gestion/           ← management: login + (app)/{agenda,caisse,clients,equipe,salaires,depenses,produits,prestations,reglages,moi}
src/app/gestion/actions.ts ← every management write (role-checked server actions)
src/app/api/               ← availability, bookings, cancel, ics, calendar feed, auth
database/schema.sql        ← schema (idempotent)
scripts/                   ← migrate, seed, build-scroll-video.py + video-shots.json
messages/{fr,es,nl,en}.json
docs/ specs/               ← RSDDF artifacts
.claude/skills/            ← reusable skills (new salon, scroll video)
```

## Roles
| Role | Access |
|---|---|
| Direction (OWNER) | everything, incl. payroll, prices, hours, team & access, expense approval, products, ambassadors, Robust SI |
| Manager | dashboard for the current month only (no profit, no year), agenda, till (credits barbers only), clients (no lifetime spend), team (read), expenses (submit). No products page, ambassadors, Robust SI or "Mon espace" |
| Barber | own agenda, own month earnings, calendar feed, password |

## Reuse for another salon
Follow `.claude/skills/robust-salon-system/SKILL.md` (≈ half a day): new Neon DB + Vercel project,
edit `src/config/salon.ts`, photos, `scripts/video-shots.json`, messages, seed, deploy.
