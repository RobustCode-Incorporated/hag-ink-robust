# Spec 009 - Tombola (management only)

Owner decision 2026-11-02: keep Hag & Ink's tombola in the project, **not on the live public site**.

- Only the OWNER sees `/gestion/tombola` (menu + `requireRole('OWNER')` on page and actions).
- Give a ticket to a client (by phone) for a draw date; number `HI-<yyyymmdd>-<4 digits>`, unique.
- Draw: uniform random (`crypto.randomInt`) among the tickets of that date; one winner per date
  (unique partial index); audited (`lottery.draw`).
- Old tickets (0 today) come through the import (`legacy_id`).
- Nothing in `messages/`, sitemap or public routes.

Acceptance: a non-owner gets redirected; drawing twice the same date is refused; the winner is in the audit log.
