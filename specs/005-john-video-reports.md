# Specification 005 - JOHN video reports (Robust SI)

Engine, contract and worker: `~/Projects/robust-john` (docs/SPEC.md, docs/CONTRACT.md).

## Goal

From the CEO tab "ROBUST SI", the CEO clicks "Générer le rapport du mois" and gets a narrated video
of the month (key figures, trend, team, result, alerts, ranked actions).

## In scope

- Table `JohnReport` (migration `20261102040000_add_john_reports`).
- `src/domains/john/monthly-facts.ts`: pure, tested computation of `john.facts/v1`
  (same rules as the treasury page: revenue - payroll - validated expenses).
- `POST/GET /api/ceo/john/reports` (CEO session), `GET /api/ceo/john/reports/:id/watch`
  (302 to a private Blob URL valid 1 h).
- `POST /api/john/worker/claim|complete` (Bearer `JOHN_WORKER_KEY`): atomic claim, presigned
  upload URL (mp4 only, 30 min, one pathname), completion, optional e-mail.
- `/ceo/robust` page: month picker, button, status polling, player, history.
- Tab label "ROBUST IA" renamed "ROBUST SI" (label only).

## Acceptance criteria

1. Figures in the video match `/ceo/treasury` for the same month.
2. A worker without the key gets 401; a CEO-less request gets redirected by middleware.
3. The video is never reachable without a CEO session (private store, signed URL).
4. A failed report shows its reason in the history.

## Deployment (not done yet)

1. Apply the migration on production (`npx prisma migrate deploy` or the SQL file).
2. Connect the Blob store to Production, set `JOHN_WORKER_KEY` in Production.
3. Merge `feat/john-reports` into `main`.
