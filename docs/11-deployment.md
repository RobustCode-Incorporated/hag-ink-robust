# 11 — Deployment & operations

| Item | Value |
|---|---|
| Vercel | project `hag-ink-robust` (team robust-codes-projects), region fra1, framework nextjs (`vercel.json`) |
| URL | https://www.hag-ink.com |
| Neon | project `hag-ink-rem` id `tiny-sea-73019063`, org Hag-Ink, branch `production`, db `hagink`, role `hagink_owner` |
| Env (Vercel) | `DATABASE_URL`, `AUTH_JWT_SECRET` (prod + preview), `NEXT_PUBLIC_SITE_URL`, `JOHN_WORKER_KEY`, `BLOB_READ_WRITE_TOKEN` (prod); optional `RESEND_API_KEY`, `EMAIL_FROM` |

## Deploy
```bash
npm run typecheck && npm run lint && npm test && npm run build
vercel deploy --prod --scope robust-codes-projects
```
Schema change: edit `database/schema.sql` (idempotent), `npm run db:migrate` (try it on a Neon branch first).

## Operations
- **Daily (manager):** open Agenda; cash every client in Caisse; check cash total vs drawer at closing.
- **Monthly (owner):** Salaires → print/PDF → pay; validate pending expenses; check stock alerts.
- **New barber:** Équipe → add (bookable) → optionally email+password → share his calendar link.
- **Holiday / closure:** Équipe → Absence → "Tout le salon".
- **Backups:** Neon point-in-time restore (6 h history on free tier; raise retention on a paid plan).
- **Logs:** Vercel → project → Logs; Neon → Monitoring.
- **Lost owner password:** run a SQL update with a new bcrypt hash, or re-seed with another `OWNER_EMAIL`.
