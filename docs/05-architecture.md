# 05 — Architecture

```
Browser ──HTTPS──> Vercel (Next.js 16, Node runtime, region fra1 default)
                    ├─ src/proxy.ts       locale routing (next-intl) + optimistic /gestion guard
                    ├─ app/[locale]/*     public RSC pages (SSR/ISR) + client islands (video, booking)
                    ├─ app/gestion/*      management RSC pages + Server Actions (role-checked)
                    ├─ app/api/*          JSON/ICS route handlers (public booking, auth, feeds)
                    └─ src/lib/db.ts      pg Pool (max 5) ──TLS──> Neon Postgres 17 (Frankfurt, pooler)
Optional: Resend HTTP API for confirmation emails.
```

## Layers
- `src/domain/` — pure rules (slots, payroll). No I/O. Unit-tested.
- `src/lib/` — services & infrastructure (db, booking, auth/session, timezone, ics, email, format).
- `src/app/` — delivery (pages, actions, route handlers). Thin: validate → call lib → render/redirect.
- `src/config/salon.ts` — tenant configuration.

## Architecture decisions (ADR)
| ADR | Decision | Why |
|---|---|---|
| ADR-001 | One Next.js app for site + management (no separate API service) | One deploy on Vercel, Server Actions remove an API layer; volume is small (one salon) |
| ADR-002 | `pg` + SQL, no ORM | Same as Debs; needs exclusion constraints/`tstzrange`; no codegen step on Vercel |
| ADR-003 | Double-booking prevented in the database (`EXCLUDE USING gist`) | Race-proof under concurrent requests; app check is only for UX |
| ADR-004 | Payment on site (no Stripe in v1) | Matches the salon's current Planity practice; Stripe deposit kept as v2 spec |
| ADR-005 | Till (`sales`) is the single revenue source | Payroll & dashboard must agree; appointments ≠ money |
| ADR-006 | Own JWT session (jose) + bcrypt, staff table as identity store | Small team, no external IdP; DB re-check per request allows instant deactivation |
| ADR-007 | Two design systems: salon brand public, Robust REM for `/gestion` | Client brand sells; our product brand stays consistent across clients (REM DEC-005) |
| ADR-008 | Scroll video pre-rendered from photos (Python + ffmpeg, JSON shot list) | No video shoot needed; reproducible; light (≈ 11 MB desktop / 7.6 MB mobile) |
| ADR-009 | Tenant isolated in config + assets; one Neon DB and one Vercel project per salon | Template reuse without multi-tenancy risk (Debs template guide principle) |
