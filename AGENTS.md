# Agent rules — Hag & Ink (Robust Enterprise Management, Salon Edition)

<!-- BEGIN:nextjs-agent-rules -->
This is Next.js 16: `middleware.ts` is now `src/proxy.ts`, request APIs are async. Read
`node_modules/next/dist/docs/` before writing framework code.
<!-- END:nextjs-agent-rules -->

## Method: Robust Specification Driven Development (RSDDF)
1. No feature without a spec in `specs/NNN-*.md` (goal, scope, acceptance criteria).
2. Update the matching artifact in `docs/` (SRS, database, API, security…) in the same change.
3. Business rules live in `src/domain/` as pure functions with tests in `tests/`.
4. Gate before merge: `npm run typecheck && npm run lint && npm test && npm run build`.

## Invariants (do not break)
- Money = integer cents. Prices charged come from the DB, never from the browser.
- Times: store UTC, convert with `src/lib/timezone.ts` (Vercel runs UTC; salon timezone = SALON.timezone, Africa/Kinshasa).
- Double booking is prevented by the `appointments_no_overlap` exclusion constraint — keep it.
- Every management page/action calls `requireRole()` (the proxy is only an optimistic redirect).
- Tenant-specific data only in `src/config/salon.ts`, `public/salon/`, `scripts/video-shots.json`, `messages/`.
- Public site = salon brand (dark/neon). Management `/gestion` = Robust REM design (snow bg, black bar, ABeeZee/Ysabeau).
- No local Docker/DB: use Neon (a branch for experiments).
