# 07 — API specification

Public JSON endpoints (no auth). Errors: `{ "error": CODE }`.

| Method | Path | Body / query | Responses |
|---|---|---|---|
| GET | `/api/availability` | `date=YYYY-MM-DD&serviceId=uuid&staffId=uuid\|any` | 200 `{slots: ["11:00", …]}` · 400 INVALID · 404 NOT_FOUND |
| POST | `/api/bookings` | `{serviceId, staffId\|"any", date, time, firstName, lastName?, phone, email?, notes?, consent: true, locale, website:""}` | 201 `{token}` · 400 INVALID/CONSENT · 404 · 409 SLOT_TAKEN · 429 TOO_MANY |
| GET | `/api/bookings/{token}/ics` | — | 200 text/calendar · 404 |
| POST | `/api/bookings/{token}/cancel` | — | 200 `{result: OK}` · 409 TOO_LATE · 404 |
| GET | `/api/calendar/{staffId}?token=…` | HMAC token per barber | 200 text/calendar (upcoming BOOKED) · 403 |
| POST | `/api/auth/login` | `{email, password}` | 200 + httpOnly cookie `lbs_session` · 401 · 429 |
| POST | `/api/auth/logout` | form post | 303 → `/gestion/login` |

Management writes are **Server Actions** in `src/app/gestion/actions.ts` (not public endpoints);
each calls `requireRole()` and redirects with `?msg=` or `?error=`.
