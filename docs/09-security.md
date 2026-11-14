# 09 — Security review

| Threat | Control |
|---|---|
| Unauthorised access to management | JWT (HS256, 12 h) in httpOnly, SameSite=Lax, Secure cookie; proxy redirect + `requireRole()` in every page and server action; DB re-check of `active` on each request |
| Privilege escalation | role matrix in `lib/nav.ts`; owner-only actions (payroll, prices, hours, staff, approvals) checked server-side; owner can't demote himself; barbers can only change their own appointments |
| Password attacks | bcrypt cost 12; min 10 chars; 16 failed attempts / 15 min per email+IP → 429 |
| Booking abuse / spam | honeypot, consent required, max 3 upcoming bookings per phone, server-side price & slot validation |
| Race conditions | DB exclusion constraint (no overlap), unique `sales.appointment_id`, conditional stock update |
| Injection | parameterised SQL everywhere; UUID/regex validation of ids & dates |
| XSS / clickjacking | React escaping; CSP (`default-src 'self'`, `frame-ancestors 'none'`), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| Data exposure | manage tokens = 144-bit random; calendar feed = HMAC token per barber; private pages `noindex`; robots blocks `/gestion`, `/api`, `/rdv` |
| Secrets | only in Vercel env / local `.env` (gitignored, vercelignored) |
| Audit | `audit_log` for logins, cancellations, voids, staff/price/hours changes, expense decisions |

GDPR: purpose = appointment management; legal basis = contract/consent; data = name, phone, optional email & note;
processors = Vercel (hosting), Neon (EU, Frankfurt), Resend (optional). To do before launch: privacy page with
the salon's legal identity (decisions.md D5).

Residual risks: `'unsafe-inline'` scripts in CSP (Next.js inline bootstrapping); no 2FA for owner (v2).
