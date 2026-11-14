# Spec 011 - Robust SI · JOHN video reports

Same engine and contract as `~/Projects/robust-john` (john.facts/v1), adapter for REM:
- `src/domain/john-facts.ts` (pure, tests/john-facts.test.ts): revenue = SERVICE sales of the month
  (salon timezone), payroll = REM `computePayroll`, balance = revenue - payroll - APPROVED expenses,
  pending expenses of all previous months ranked first; REJECTED ignored.
- `/gestion/robust-si` (OWNER, MANAGER): month + language (fr/en), "Générer", status, player, history.
- `/api/john/worker/claim|complete` (Bearer JOHN_WORKER_KEY), `/api/john/reports/[id]/watch` (session, 302 to private Blob, 1 h).
- Table `john_reports`.

Acceptance: October 2026 facts from REM equal the old system's (15,900 USD, 123 services,
4,159.50 USD commissions, 16 pending expenses for 1,620 USD) — verified 2026-11-02.
