# Specification 001 — Membership activation

## Goal

Activate a client's selected Hag & Ink membership using the current Prisma data model (`Client`, `Plan`, and `LotteryTicket`). This replaces the obsolete `Subscription` persistence flow.

## In scope

- Accept a `clientId` and a recognised membership plan code.
- Confirm that the client exists.
- Confirm that a matching plan exists in the catalogue and that its stored price and duration match the approved Hag & Ink plan catalogue.
- Set the client's active `planId` and `planEndsAt`.
- Create the plan's lottery tickets and set their draw date to membership expiry.
- Return the activated plan, expiry, 5% RSE contribution, and ticket numbers.
- Persist the client update and tickets atomically.

## Out of scope

- Charging a payment method or issuing an invoice.
- Authentication, authorisation, booking, and lottery draw selection.
- Migrating or seeding a live database.

## Acceptance criteria

1. A valid Standard Adulte activation costs $89, ends after one calendar month, records 5% RSE ($4.45), and creates one ticket.
2. Limited Edition creates two tickets.
3. An unknown client fails without writing anything.
4. An unknown plan or a database plan whose price/duration differs from the approved catalogue fails without writing anything.
5. The client membership update and ticket creation are submitted as a single repository operation.
