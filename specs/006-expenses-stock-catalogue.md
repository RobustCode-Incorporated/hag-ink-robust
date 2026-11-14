# Spec 006 — Expenses, stock, catalogue, hours

- **Expenses:** categories LOYER/PRODUITS/MATERIEL/CHARGES/MARKETING/AUTRE; manager → PENDING, owner → APPROVED directly; owner approves/rejects; only APPROVED counts in the dashboard.
- **Products:** purchase & sale price, margin, stock, low-stock threshold (dashboard alert), +/− adjustments (audited), 30-day sales, stock value.
- **Catalogue:** owner edits FR/ES/NL/EN names, category, duration, price, allowed days, online/active, order → public site revalidated.
- **Hours:** owner edits per weekday or closed → slots and public hours update.

## Acceptance criteria
1. A manager's expense doesn't change the result until approved.
2. Selling more than the stock is refused with a clear message.
3. Deactivating a service hides it from the site and booking but keeps history.
4. Setting Monday closed removes Monday from the booking day chips.
