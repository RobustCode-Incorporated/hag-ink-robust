# Spec 005 — Payroll

**Origin.** Hag & Ink payroll domain (25 %/30 % hard-coded) → generalised per staff member.

Rules (`src/domain/payroll.ts`):
- COMMISSION: `round(rate × service revenue)` for the month; product sales don't earn commission.
- FIXED: monthly fixed salary.
- Tips: 100 % to the staff member who received them.
- Salon share = service revenue − commissions.
Page `/gestion/salaires?month=YYYY-MM`, printable (A4).

## Acceptance criteria
1. 2 services (25 € + 30 €) at 50 % + 5 € tip + 10 € product → commission 27.50 €, total due 32.50 €. *(tests/payroll.test.ts)*
2. A rate outside 0–100 % is clamped. 3. Voided sales are excluded. 4. Staff inactive but with sales in the month still appear.
