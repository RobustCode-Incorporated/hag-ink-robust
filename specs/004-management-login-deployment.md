# Specification 004 - Management login and deployment first

## Goal

Publish only the management workspace (CEO + Manager) so business operations can start now, while the public client subscription site remains disabled until Stripe client flow is completed.

## In scope

- Role-specific login entries:
  - `/login/ceo` for CEO/Admin
  - `/login/manager` for Manager
- Session authentication with secure HTTP-only cookie.
- Middleware route protection for management pages and APIs.
- Management-only release mode that blocks public client routes and payment/subscription APIs.
- Deployment readiness for Vercel or Render with required environment variables and migration steps.

## Out of scope

- Client public subscription checkout UX completion.
- New Stripe client pages or additional payment flow features.
- Multi-user IAM, password reset, MFA, or SSO.

## Functional requirements

1. Login API accepts `email`, `password`, and `role` (`CEO` or `MANAGER`).
2. Successful login sets a signed session cookie and returns redirect target for the role dashboard.
3. Middleware redirects unauthenticated CEO requests to `/login/ceo` and manager requests to `/login/manager`.
4. Middleware denies cross-role access (manager cannot access CEO routes and vice versa).
5. In `NEXT_PUBLIC_MANAGEMENT_ONLY=true`, these routes are blocked:
   - `/client`
   - `/plans`
   - `/api/payments/*`
   - `/api/subscriptions/*`
6. Logout clears session cookie and redirects back to login portal.

## Deployment requirements

1. Production environment variables are defined:
   - `DATABASE_URL`
   - `AUTH_JWT_SECRET`
   - `NEXT_PUBLIC_MANAGEMENT_ONLY=true`
   - `CEO_LOGIN_EMAIL`
   - `CEO_LOGIN_PASSWORD`
   - `MANAGER_LOGIN_EMAIL`
   - `MANAGER_LOGIN_PASSWORD`
2. Database migrations are applied in production with `npx prisma migrate deploy`.
3. Post-deploy smoke test validates:
   - CEO login path and dashboard access.
   - Manager login path and dashboard access.
   - Role isolation between `/ceo` and `/manager`.
   - Public routes are disabled in management-only mode.

## Acceptance criteria

1. CEO can authenticate via `/login/ceo` and reach `/ceo`.
2. Manager can authenticate via `/login/manager` and reach `/manager`.
3. Unauthenticated users cannot open `/ceo`, `/manager`, `/api/ceo/*`, or `/api/manager/*`.
4. Session cookie is HTTP-only, same-site lax, has expiration, and is secure in production.
5. With management-only mode enabled, public client routes are inaccessible.
6. Deployment on Vercel or Render is repeatable using README and `.env.example` only.

## Vercel checklist (click by click)

### A. Create the project in Vercel

1. Open https://vercel.com and sign in.
2. Click Add New...
3. Click Project.
4. In Import Git Repository, select the repository `hag-ink-robust`.
5. Click Import.
6. In Configure Project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (project root)
   - Build Command: keep default (`next build`) for now
   - Output Directory: keep default
7. Do not click Deploy yet.

### B. Add production environment variables

1. In the same Configure Project screen, open Environment Variables.
2. Add each variable one by one with Environment set to Production:
   - `DATABASE_URL`
   - `AUTH_JWT_SECRET`
   - `NEXT_PUBLIC_MANAGEMENT_ONLY` with value `true`
   - `CEO_LOGIN_EMAIL`
   - `CEO_LOGIN_PASSWORD`
   - `MANAGER_LOGIN_EMAIL`
   - `MANAGER_LOGIN_PASSWORD`
3. For all secrets, paste values from your secure source (not from committed files).
4. Click Deploy.

### C. Run production migration (required)

1. Wait for the first deployment to finish.
2. On your machine, in project root, ensure production env values are loaded.
3. Run:

```bash
npx prisma migrate deploy
```

4. Confirm command output indicates pending migrations were applied.

### D. Trigger final production redeploy

1. In Vercel, open the project.
2. Click Deployments.
3. On the latest deployment, click the three-dot menu.
4. Click Redeploy.
5. Keep Use existing Build Cache enabled.
6. Click Redeploy.

### E. Smoke test (management-only)

1. Open production URL + `/login/ceo`.
2. Log in with CEO credentials and confirm redirect to `/ceo`.
3. Open production URL + `/login/manager`.
4. Log in with manager credentials and confirm redirect to `/manager`.
5. While logged in as manager, try opening `/ceo` and confirm access is denied/redirected.
6. While logged in as CEO, try opening `/manager` and confirm access is denied/redirected.
7. Open `/client` and confirm it is blocked in management-only mode.
8. Open `/plans` and confirm it is blocked in management-only mode.

### F. Post-deploy safety checks

1. In Vercel, open Project Settings > Environment Variables.
2. Confirm every variable exists in Production scope.
3. Verify `NEXT_PUBLIC_MANAGEMENT_ONLY=true`.
4. Rotate `AUTH_JWT_SECRET` and passwords if they were ever shared in plain text.

## Vercel troubleshooting (current case)

- Log line `Applying modifyConfig from Vercel` is informational and normal. It is not an error.
- Wait for the next lines (`Compiled successfully`, route list, and `Deployment completed`).
- If build fails after this point, first verify Production env vars are present in Vercel:
   - `DATABASE_URL`
   - `AUTH_JWT_SECRET`
   - `NEXT_PUBLIC_MANAGEMENT_ONLY=true`
   - `CEO_LOGIN_EMAIL`
   - `CEO_LOGIN_PASSWORD`
   - `MANAGER_LOGIN_EMAIL`
   - `MANAGER_LOGIN_PASSWORD`
- After env correction, trigger a redeploy from Deployments > three-dot menu > Redeploy.
- If deployment succeeds but login fails, check that the manager identifier exactly matches the configured value (including case).
