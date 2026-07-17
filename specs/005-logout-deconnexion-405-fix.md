# Specification 005 - Déconnexion must never trigger `405` from `/ceo`

## Goal

Fix the management logout flow so clicking **Déconnexion** always clears the session and returns to login without any `405 Method Not Allowed`.

## Problem statement

Authenticated users clicking **Déconnexion** triggered:

- client call: `POST /api/auth/logout`
- middleware redirect to role home (for example `/ceo`) because `/api/auth/logout` was treated like a login page
- redirected request kept method `POST`
- `/ceo` does not accept `POST`, so browser console showed `405`

Result: logout looked broken, even though the button was wired.

## In scope

1. Middleware behavior for authenticated requests to `/api/auth/logout`.
2. Regression coverage proving logout API requests are not redirected.
3. Project documentation update so this edge case is preserved in future changes.

## Out of scope

1. Login credential strategy changes.
2. Session token format changes.
3. New authentication providers.

## Functional requirements

1. `POST /api/auth/logout` must always reach the route handler, regardless of session cookie presence.
2. Authenticated users requesting `/login*` routes should still be redirected to their role home.
3. Logout route continues clearing `hag_session` cookie and returns `{ success: true }`.

## Acceptance criteria

1. Clicking **Déconnexion** from `/ceo` or `/manager` does not emit `405` in the browser console.
2. Middleware response for `POST /api/auth/logout` is passthrough (`NextResponse.next()`), not redirect.
3. Middleware response for authenticated `GET /login/ceo` remains redirect to `/ceo`.
4. `middleware.test.ts` includes both behaviors and passes.

## Test specification

### Test case 1: logout request passthrough

- **Given:** request `POST /api/auth/logout` with valid `hag_session` cookie.
- **When:** middleware runs.
- **Then:** no `location` header is present and `x-middleware-next=1`.

### Test case 2: login page redirect preserved

- **Given:** request `GET /login/ceo` with valid `hag_session` cookie.
- **When:** middleware runs.
- **Then:** response redirects (`307`) to `/ceo`.
