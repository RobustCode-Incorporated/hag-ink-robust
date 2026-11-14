# Spec 003 — Management login & roles

**Goal.** Secure access to `/gestion` with three roles. **Origin:** Hag & Ink JWT login, generalised to DB users.

| Capability | OWNER | MANAGER | BARBER |
|---|---|---|---|
| Dashboard (finance: expenses, commissions, result) | ✅ | ops figures only | — (→ Mon espace) |
| Agenda | all barbers | all barbers | own column |
| Caisse, clients, produits | ✅ | ✅ | — |
| Équipe: view / absences | ✅ | ✅ | — |
| Équipe: create/edit staff, logins, pay | ✅ | — | — |
| Salaires, prestations, réglages, expense approval | ✅ | — | — |
| Mon espace (stats, calendar feed, password) | ✅ | ✅ | ✅ |

## Acceptance criteria
1. Wrong password → 401 generic message; > 16 failures in 15 min (email or IP) → 429.
2. No cookie on `/gestion/*` → redirect `/gestion/login`; a barber opening `/gestion/salaires` → redirect.
3. Deactivating a staff member blocks his next request even with a valid token.
4. The owner cannot remove his own OWNER role or deactivate himself.
5. First owner account created by `npm run db:seed` (password printed once).
