# Specification 002 — Safe development seed

## Goal

Provide repeatable, non-destructive development data for the current Hag & Ink Prisma schema so the membership checkout and CEO dashboard can be exercised locally.

## In scope

- Seed all approved membership plans using their domain prices and durations.
- Seed one demo client with the ID used by `/plans`.
- Seed the five Hag & Ink barbers used by the manager interface.
- Seed a small deterministic set of services and expenses for CEO dashboard charts and KPIs.
- Make the operation idempotent: rerunning it updates the same records instead of deleting the database or duplicating demo transactions.

## Out of scope

- Deleting or resetting production records.
- Creating authentication credentials or making the seed appropriate for production.
- Importing historical CSV data.

## Acceptance criteria

1. The seed plan catalogue has every `PlanName` from the membership domain with the matching price and 30-day duration.
2. The demo client ID is `robust-client-test-id-2026`, matching the `/plans` screen default.
3. Every seeded service refers to a seeded barber and every seeded record has a stable ID.
4. Seed fixtures are safe to rerun because every entity can be created or updated by its stable identifier.
