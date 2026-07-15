# Hag & Ink — ROBUST Enterprise Management

Hag & Ink is the V2 foundation for a premium barber and tattoo business. It pairs a public, client-facing membership experience with an internal enterprise-management workspace for operational managers and executive leadership.

The product direction is deliberately broader than a booking site: it is intended to bring services, memberships, loyalty, staffing, payroll, stock, expenses, invoicing, and executive performance reporting into one platform. The repository currently contains the first implementation of that foundation, including a working CEO analytics API, membership domain rules, payroll calculation rules, and a PostgreSQL data model for the wider operation.

> **Current status:** early-stage / in active development. The product vision includes ROBUST IA growth intelligence, HR and material-resource analytics, booking, payments, and role-secured access. Those areas are represented in the UI or data model in varying degrees, but are not all implemented end to end yet. See [Implementation status](#implementation-status) for the precise scope.

## Product goals

- Give the CEO a command center for revenue, expenses, net profit, service volume, barber performance, and recent transactions.
- Give a manager a fast operational flow for recording completed services and tracking team performance.
- Give clients a premium Hag & Ink discovery experience with memberships and a VIP lottery/loyalty proposition.
- Centralize human resources: staff roles, fixed salaries, barber commissions, payroll reporting, and employee-related expenses.
- Centralize material resources: inventory, consumable products used in services, and retail-product stock.
- Support business growth through trustworthy operational data. ROBUST IA is the planned intelligence layer that can turn this data into forecasts, recommendations, retention actions, and growth scenarios.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16.2, React 19, TypeScript, App Router |
| UI | Tailwind CSS 4, Framer Motion, Lucide React |
| Charts | ApexCharts / React ApexCharts (Recharts is also installed) |
| Database | PostgreSQL, designed for Neon-hosted PostgreSQL |
| Data access | Prisma 7 with `@prisma/adapter-pg` and `pg` |
| Tests | Vitest 4, Testing Library, JSDOM |
| Import tooling | `tsx`, `csv-parser`, `dotenv` |

The application uses the `src/app` App Router convention. Dashboard charts are dynamically imported with SSR disabled because they depend on browser rendering. Global typography uses `next/font` (Geist, Geist Mono, and Black Ops One), and static visual assets live in `public/`.

## Main experiences

### Public client portal — `/client`

The public-facing page establishes the premium Hag & Ink brand with animated content, full-bleed imagery, and responsive membership cards. It presents six standard memberships plus a Limited Edition VIP offer and a loyalty lottery with prize content.

Selecting a membership opens a slide-over client-profile form. It collects `firstName`, `lastName`, `phone`, and optional `email`, then starts a Stripe-hosted Checkout session. Card details are handled by Stripe and are never collected or stored by Hag & Ink.

### Manager dashboard — `/manager`

The manager UI provides a form to record a service: selected barber, amount, and description. It is designed to register revenue at the point of service and trigger the commission workflow.

The manager navigation now includes a "Coiffeurs" link that opens a dedicated barber registration page under `/manager/coiffeurs`. This page allows the manager to view registered barbers and add new ones.

The screen presently targets `POST /api/services/create`, but that route does not yet exist in `src/app/api`; its barber and manager IDs are also development placeholders. The UI is therefore not an end-to-end operational flow yet.

### CEO command center — `/` and `/ceo`

Both routes render executive reporting backed by `GET /api/ceo/stats`.

- Time filters: all time, last 30 days, last 7 days.
- KPIs: total revenue, expenses, net profit, and number of services.
- Area chart: revenue evolution by month.
- Donut chart: revenue by barber.
- Searchable table: recent services by barber and date.

The root dashboard additionally includes dark-mode styling and percentage trend badges, but the current API does not return `trendRevenue` or `trendProfit`, so these badges have no live calculation behind them.

## Business rules currently implemented

### Memberships and loyalty

`src/domains/subscription/subscribe.ts` is a standalone, tested business domain. It defines monthly plans, their prices, the number of lottery tickets, and the 5% RSE contribution:

| Plan | Price | Tickets |
| --- | ---: | ---: |
| Standard Enfant | $49 | 1 |
| Standard Adulte | $89 | 1 |
| Braids A | $89 | 1 |
| Braids B | $189 | 1 |
| Locks A | $209 | 1 |
| Locks B | $329 | 1 |
| Limited Edition | $229 | 2 |

For each subscription it creates an end date one month after the start date, rounds the RSE contribution to two decimals, and generates `LUCK-2026-…` ticket identifiers.

### Payroll

`src/domains/payroll/payroll.ts` is another standalone, tested domain. Given staff and completed services, it calculates:

- fixed payroll for managers, cleaners, or any staff member configured as fixed salary;
- barber commission from service revenue;
- a 30% commission exception for a barber whose name includes `Soumaré`/`Soumare`;
- a 25% commission for other barbers; and
- fixed-pay, commission, and total payroll aggregates.

This calculator has no API or dashboard integration yet.

## Data model

The current Prisma schema models the end-state business domain in PostgreSQL:

```text
User ── optional 1:1 ── Barber
  │                       │
  └── optional 1:1 ── Client ── Appointments ── Barber
                              ├─ Services ── Invoice
                              │            └─ ServiceProduct ── Product
                              └─ Plan / LotteryTicket

User ── Expenses
```

Key records include:

- `User` and roles: `CEO`, `MANAGER`, `BARBER`, `CLEANER`, `CLIENT`.
- `Barber` with fixed/commission compensation configuration.
- `Client`, `Plan`, `Appointment`, and `LotteryTicket` for the B2C relationship.
- `Service`, `Invoice`, `Product`, and `ServiceProduct` for sales, compliance, and inventory consumption.
- `Expense` with validation and optional employee link for business costs and payroll tracking.
- `Payment` for Stripe event/session tracking and webhook idempotency.

## API surface

| Endpoint | Method | Purpose | Current state |
| --- | --- | --- | --- |
| `/api/ceo/stats?period=all\|month\|week` | `GET` | Aggregates services and expenses for the CEO dashboard. | Implemented against the current Prisma schema. |
| `/api/subscriptions/checkout` | `POST` | Validates a client and approved catalogue plan, activates the membership, and creates lottery tickets. | Implemented against the current schema; requires seeded `Client` and `Plan` records. |
| `/api/payments/create-checkout-session` | `POST` | Upserts the client profile and creates a Stripe Checkout session for the selected plan. | Requires `STRIPE_SECRET_KEY`. |
| `/api/payments/webhook` | `POST` | Verifies Stripe events and activates paid memberships. | Requires `STRIPE_WEBHOOK_SECRET`. |
| `/api/barbers` | `GET`/`POST` | Lists barbers and creates new barber records. | Implemented. |
| `/api/cleaners` | `GET`/`POST` | Lists cleaners and creates new cleaner records. | Implemented. |
| `/api/services/create` | `POST` | Intended manager service-entry endpoint. | Referenced by the manager UI, not implemented. |

### Important database migration note

The migrations show a major B2C-schema rewrite. The latest migration removes the former `Subscription` and `BarberProfile` tables and replaces them with `Client`, `Plan`, `LotteryTicket`, and `Barber` models. The checkout route has been reconciled with this model: it updates `Client.planId` / `planEndsAt` and creates `LotteryTicket` records in one transaction.

`prisma/seed.ts` is now a current-schema, non-destructive development seed. It upserts the approved plan catalogue, demo client, barbers, services, and expenses in one transaction. The legacy CSV importer and role-update script still reference removed fields and must not be run yet.

## Project structure

```text
src/
├── app/
│   ├── api/
│   │   ├── ceo/stats/route.ts             # CEO reporting API
│   │   └── subscriptions/checkout/route.ts # Membership API
│   ├── client/page.tsx                    # Public premium client experience
│   ├── manager/page.tsx                   # Manager service-entry UI
│   ├── manager/coiffeurs/page.tsx         # Manager barber registration UI
│   ├── ceo/page.tsx                       # CEO dashboard
│   ├── ceo/hr/page.tsx                    # CEO human resources dashboard
│   ├── plans/page.tsx                     # Subscription integration UI
│   ├── layout.tsx                         # Shared internal navigation and fonts
│   └── page.tsx                           # CEO dashboard at the root route
├── components/                            # Reusable UI utilities
├── domains/
│   ├── payroll/                           # Payroll business rules + tests
│   └── subscription/                      # Membership business rules + tests
└── test/                                  # Vitest setup

prisma/
├── schema.prisma                          # Target PostgreSQL business schema
├── migrations/                            # Database migration history
├── seed.ts                                # Non-destructive development seed
├── development-data.ts                    # Deterministic development fixtures
└── import_csv.ts                          # Legacy service-import utility; needs alignment
```

## Local setup

### Prerequisites

- Node.js 20.9 or later (recommended for Next.js 16)
- npm
- A PostgreSQL database, typically a Neon PostgreSQL project

### Install and configure

```bash
npm install
```

Create `.env` in the repository root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
AUTH_JWT_SECRET="replace_with_a_long_random_secret"
CEO_LOGIN_EMAIL="admin@hagink.local"
CEO_LOGIN_PASSWORD="change_me"
MANAGER_LOGIN_EMAIL="manager@hagink.local"
MANAGER_LOGIN_PASSWORD="change_me"
NEXT_PUBLIC_MANAGEMENT_ONLY="true"
STRIPE_SECRET_KEY="sk_test_replace_me"
STRIPE_WEBHOOK_SECRET="whsec_replace_me"
```

Apply the committed schema migrations to a new development database:

```bash
npx prisma migrate dev
```

Load the non-destructive development fixtures. This upserts only the named demo records; it does not clear your database:

```bash
npm run db:seed
```

Generate the Prisma client when required:

```bash
npx prisma generate
```

Start the application:

```bash
npm run dev
```

Then open `http://localhost:3000`.

### Useful routes

| URL | Audience |
| --- | --- |
| `http://localhost:3000/` | CEO command center |
| `http://localhost:3000/ceo` | CEO command center (alternate route) |
| `http://localhost:3000/manager` | Manager operations UI |
| `http://localhost:3000/manager/coiffeurs` | Manager barber registration |
| `http://localhost:3000/ceo/hr` | CEO human resources dashboard |
| `http://localhost:3000/ceo/treasury` | CEO treasury, payroll, and bills overview |
| `http://localhost:3000/client` | Public client experience |
| `http://localhost:3000/ceo/products` | CEO product analytics |
| `http://localhost:3000/manager/products` | Manager product operations |
| `http://localhost:3000/login` | Management login portal |
| `http://localhost:3000/login/ceo` | CEO/Admin login |
| `http://localhost:3000/login/manager` | Manager login |

## Management-only release mode

For the current delivery phase you can publish only the management workspace (CEO + Manager) while keeping the public client site unavailable.

- Set `NEXT_PUBLIC_MANAGEMENT_ONLY=true`.
- Configure one of these authentication sources:
  - explicit environment credentials (`CEO_LOGIN_*`, `MANAGER_LOGIN_*`), or
  - database-backed `User` records with matching role/email/password.
- Use `/login/ceo` and `/login/manager` for separate role access.
- `/client`, `/plans`, `/api/payments/*`, and `/api/subscriptions/*` are blocked in management-only mode.

### Vercel quick publish

1. Import the repository in Vercel.
2. Add all environment variables from the `.env` template.
3. Ensure `DATABASE_URL` points to your production PostgreSQL (for example Neon).
4. Deploy.
5. Run migrations against production DB: `npx prisma migrate deploy`.
6. Verify login routes and dashboards:
   - `/login/ceo` → `/ceo`
   - `/login/manager` → `/manager`

### Render quick publish

1. Create a new Web Service from this repository.
2. Build command: `npm install && npm run build`.
3. Start command: `npm run start`.
4. Add the same environment variables (`DATABASE_URL`, auth vars, management mode).
5. Run migrations in Render shell: `npx prisma migrate deploy`.
6. Validate CEO/Manager login and route protection.

## Commands and verification

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Produces a production build. |
| `npm run start` | Runs the production server after a successful build. |
| `npm run lint` | Runs ESLint across the project. |
| `npm run db:seed` | Upserts the local development catalogue and dashboard fixtures. |
| `npm run db:validate` | Validates the Prisma schema. |
| `npx vitest run` | Runs domain unit tests. |

At the time this README was written:

- `npx vitest run` passes: 2 test files and 3 tests.
- `npm run lint` currently reports 35 errors, mainly unsafe `any` types, unescaped JSX apostrophes, and React effect/state warnings.
- `npm run build` could not complete in the restricted execution environment because `next/font` could not fetch Google Fonts. A network-enabled environment is needed to distinguish that environmental failure from application build issues.

## Implementation status

| Area | Status | Notes |
| --- | --- | --- |
| Premium client landing page | Implemented | Responsive branded presentation with plans and lottery content. |
| CEO revenue/expense dashboard | Implemented | Live aggregation API, charts, filters, and transactions table. |
| Membership rules | Implemented and tested | Prices, RSE calculation, dates, and lottery-ticket generation. |
| Payroll rules | Implemented and tested | Fixed salaries plus 30%/25% barber commissions. |
| PostgreSQL enterprise model | Implemented | Schema covers customers, booking, products, invoices, expenses, and lottery. |
| Membership persistence | Implemented | Atomic client-plan activation and ticket creation; non-destructive development seed is available. |
| Manager service persistence | Not implemented | UI exists; its API route is missing. |
| Authentication and role authorization (management workspace) | Implemented | JWT cookie sessions with role checks protect `/ceo`, `/manager`, and matching APIs. Separate login routes are available for CEO and Manager. |
| Booking and calendar | Data-model ready | No booking API or client flow yet. |
| Stock operations and invoicing | Data-model ready | No UI/API workflow yet. |
| ROBUST IA business-growth engine | Planned | No AI provider, prompt workflow, prediction model, or API is in this repository yet. |
| Stripe Checkout creation | Implemented | Client portal creates a secure hosted Stripe Checkout session. |
| Payment confirmation / membership activation | Implemented | A signed Stripe webhook records payment and atomically activates the plan and lottery tickets. |

## Recommended delivery sequence

1. Reconcile the historical CSV importer and CEO role-update script with the latest Prisma schema.
2. Implement authenticated sessions and server-side role authorization for CEO, manager, barber, cleaner, and client routes.
3. Build the missing service-entry endpoint, then connect service recording to inventory consumption, invoices, and payroll periods.
4. Implement client registration, appointment availability, booking, and a real payment provider before enabling public checkout.
5. Add HR, expense-approval, inventory, and invoice workflows around the existing schema.
6. Add ROBUST IA only after the data flows are trustworthy: measurable KPIs, data-retention rules, human review, and auditable recommendations should precede automated actions.
7. Resolve lint issues, add integration tests for APIs, and verify a production build in a network-enabled CI environment.

## Security and production notes

- Never commit `.env` or database credentials.
- Current management login supports env-based credentials and database fallback credentials. Move to hashed passwords before public, multi-user rollout.
- Enforce roles on the server, not only in the UI.
- Validate all request bodies and authorization before creating services, expenses, invoices, appointments, or subscriptions.
- Use integer minor currency units or a decimal database type for production financial calculations; the current implementation uses JavaScript `number`/Prisma `Float`.
- Lottery ticket generation currently uses `Math.random()` and should be replaced with a cryptographically secure, collision-safe mechanism before production use.

## License

No license has been declared in this repository. All rights are reserved until a license is added.
