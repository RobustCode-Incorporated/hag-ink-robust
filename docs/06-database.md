# 06 — Database specification

Source of truth: [`database/schema.sql`](../database/schema.sql) (idempotent, `npm run db:migrate`).
Neon project `latinos-barber` (`red-haze-10774187`), branch `main`, database `latinos`, Postgres 17, eu-central-1.

| Table | Purpose | Key constraints |
|---|---|---|
| `staff` | team + logins + pay settings | `email UNIQUE`, `commission_rate 0..1` |
| `services` | catalogue (4 language names) | `slug UNIQUE`, duration 5–480, `allowed_days smallint[]` |
| `opening_hours` | weekday → opens/closes | both NULL = closed, `opens < closes` |
| `clients` | client file | `phone UNIQUE` (normalised +32…) |
| `appointments` | bookings | `EXCLUDE (staff_id =, tstzrange(starts_at, ends_at) &&) WHERE status IN (BOOKED, COMPLETED)`, `manage_token UNIQUE` |
| `time_off` | absences (staff_id NULL = salon closed) | `ends_at > starts_at` |
| `products` | retail stock | `sku UNIQUE` |
| `sales` | every till entry | `appointment_id UNIQUE`, kind/service/product coherence CHECK |
| `expenses` | costs with approval | `amount_cents > 0` |
| `audit_log` | sensitive actions | — |
| `login_attempts` | brute-force window | index (key, at) |

Conventions: UUID PKs (`gen_random_uuid()`), money in integer cents, `timestamptz` in UTC,
enums for statuses. Extensions: `pgcrypto`, `btree_gist`.

Retention (to confirm with the salon): clients inactive > 3 years can be anonymised; `login_attempts` older than 30 days purged.
