-- Hag & Ink — Robust Enterprise Management, Salon Edition schema (from the REM Salon template).
-- Idempotent: safe to run again (npm run db:migrate). Spec: docs/05-database.md
-- Money is always stored in integer cents. Times are timestamptz (UTC);
-- the salon's wall clock is Europe/Brussels (see src/lib/timezone.ts).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'BARBER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE pay_type AS ENUM ('COMMISSION', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE appointment_source AS ENUM ('ONLINE', 'PHONE', 'WALK_IN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Team: owner, managers and barbers. Login is optional (email + password_hash).
CREATE TABLE IF NOT EXISTS staff (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name        text NOT NULL,
  role                staff_role NOT NULL DEFAULT 'BARBER',
  email               text UNIQUE,
  password_hash       text,
  phone               text,
  instagram           text,
  bio                 text,
  photo_url           text,
  pay_type            pay_type NOT NULL DEFAULT 'COMMISSION',
  commission_rate     numeric(4,3) NOT NULL DEFAULT 0.500 CHECK (commission_rate BETWEEN 0 AND 1),
  fixed_salary_cents  integer NOT NULL DEFAULT 0 CHECK (fixed_salary_cents >= 0),
  bookable            boolean NOT NULL DEFAULT true,
  active              boolean NOT NULL DEFAULT true,
  sort                integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Service catalogue (prices charged come from here, never from the browser).
CREATE TABLE IF NOT EXISTS services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  category       text NOT NULL,                 -- HOMME | ETUDIANT | PRODUIT
  name_fr        text NOT NULL,
  name_es        text,
  name_nl        text,
  name_en        text,
  note_fr        text,
  duration_min   integer NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
  price_cents    integer NOT NULL CHECK (price_cents >= 0),
  allowed_days   smallint[],                    -- NULL = every opening day; else 0=Sun..6=Sat
  online         boolean NOT NULL DEFAULT true, -- bookable from the public site
  active         boolean NOT NULL DEFAULT true,
  sort           integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Opening hours. weekday = 0 (Sunday) .. 6 (Saturday). NULL opens = closed.
CREATE TABLE IF NOT EXISTS opening_hours (
  weekday  smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  opens    time,
  closes   time,
  CHECK ((opens IS NULL AND closes IS NULL) OR (opens < closes))
);

CREATE TABLE IF NOT EXISTS clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   text NOT NULL,
  last_name    text NOT NULL DEFAULT '',
  phone        text NOT NULL UNIQUE,          -- normalised E.164-ish, clients matched by phone
  email        text,
  notes        text,
  marketing_ok boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  staff_id      uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  service_id    uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  status        appointment_status NOT NULL DEFAULT 'BOOKED',
  source        appointment_source NOT NULL DEFAULT 'ONLINE',
  price_cents   integer NOT NULL CHECK (price_cents >= 0),
  notes         text,
  locale        text NOT NULL DEFAULT 'fr',
  manage_token  text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_by    uuid REFERENCES staff(id),
  cancelled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- The double-booking guard: one barber can never hold two overlapping live appointments.
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status IN ('BOOKED', 'COMPLETED'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments (starts_at);
CREATE INDEX IF NOT EXISTS appointments_client_idx ON appointments (client_id);

-- Absences / blocked periods. staff_id NULL = the whole salon is closed.
CREATE TABLE IF NOT EXISTS time_off (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid REFERENCES staff(id) ON DELETE CASCADE,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  sku                 text UNIQUE,
  purchase_cents      integer NOT NULL DEFAULT 0 CHECK (purchase_cents >= 0),
  price_cents         integer NOT NULL CHECK (price_cents >= 0),
  stock_qty           integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 3,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Every euro that enters the till: a service (optionally from an appointment) or a product.
CREATE TABLE IF NOT EXISTS sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('SERVICE', 'PRODUCT')),
  staff_id        uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  appointment_id  uuid UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  service_id      uuid REFERENCES services(id) ON DELETE RESTRICT,
  product_id      uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity        integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents    integer NOT NULL CHECK (amount_cents >= 0),
  tip_cents       integer NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  payment_method  payment_method NOT NULL DEFAULT 'CASH',
  description     text,
  created_by      uuid REFERENCES staff(id),
  voided_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'SERVICE' AND service_id IS NOT NULL) OR (kind = 'PRODUCT' AND product_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sales_created_idx ON sales (created_at);
CREATE INDEX IF NOT EXISTS sales_staff_idx ON sales (staff_id, created_at);

CREATE TABLE IF NOT EXISTS expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL,   -- LOYER | PRODUITS | MATERIEL | CHARGES | MARKETING | AUTRE
  description   text NOT NULL,
  amount_cents  integer NOT NULL CHECK (amount_cents > 0),
  spent_on      date NOT NULL DEFAULT CURRENT_DATE,
  status        expense_status NOT NULL DEFAULT 'PENDING',
  created_by    uuid REFERENCES staff(id),
  decided_by    uuid REFERENCES staff(id),
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Who did what (sensitive actions only: money, cancellations, team changes).
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  actor_id   uuid REFERENCES staff(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  data       jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);

-- Login brute-force protection.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_key_idx ON login_attempts (key, at);

-- Migration from the old Hag & Ink system (spec 006). legacy_id = id in the old database,
-- so the import can run again without duplicates.
ALTER TABLE staff    ADD COLUMN IF NOT EXISTS legacy_id text UNIQUE;
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS legacy_id text UNIQUE;
ALTER TABLE sales    ADD COLUMN IF NOT EXISTS legacy_id text UNIQUE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS legacy_id text UNIQUE;
-- Old records REM has no module for yet (monthly plans, FlexPay payments, tombola): kept as-is.
CREATE TABLE IF NOT EXISTS legacy_archive (
  kind       text NOT NULL,
  legacy_id  text NOT NULL,
  payload    jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, legacy_id)
);

-- Tombola (spec 009): management only, never on the public site.
CREATE TABLE IF NOT EXISTS lottery_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_num  text NOT NULL UNIQUE,
  draw_date   date NOT NULL,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  is_winner   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES staff(id),
  legacy_id   text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lottery_tickets_draw_idx ON lottery_tickets (draw_date);
-- One winner per draw date.
CREATE UNIQUE INDEX IF NOT EXISTS lottery_one_winner_per_draw ON lottery_tickets (draw_date) WHERE is_winner;

-- JOHN (Robust SI) video reports (spec 011).
DO $$ BEGIN
  CREATE TYPE john_status AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS john_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL DEFAULT 'MONTHLY' CHECK (kind IN ('MONTHLY', 'DAILY')),
  period_key    text NOT NULL,
  language      text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  status        john_status NOT NULL DEFAULT 'QUEUED',
  facts         jsonb NOT NULL,
  script        jsonb,
  blob_path     text,
  duration_sec  real,
  error         text,
  attempts      integer NOT NULL DEFAULT 0,
  requested_by  uuid REFERENCES staff(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
CREATE INDEX IF NOT EXISTS john_reports_queue_idx ON john_reports (status, created_at);

-- UGC / ambassador program (spec 010, phases 1-3).
CREATE TABLE IF NOT EXISTS ambassador_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   text NOT NULL,
  last_name    text NOT NULL DEFAULT '',
  phone        text NOT NULL,
  email        text,
  instagram    text,
  tiktok       text,
  audience     text,                -- self-declared ("2 000 abonnés Kinshasa"), checked by the salon
  motivation   text,
  consent_at   timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by   uuid REFERENCES staff(id),
  decided_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- One open application per phone.
CREATE UNIQUE INDEX IF NOT EXISTS ambassador_app_open_phone ON ambassador_applications (phone) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS ambassadors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid UNIQUE REFERENCES ambassador_applications(id),
  display_name    text NOT NULL,
  slug            text NOT NULL,
  phone           text NOT NULL,
  instagram       text,
  tiktok          text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ambassadors_slug_ci ON ambassadors (lower(slug));

CREATE TABLE IF NOT EXISTS promo_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  ambassador_id     uuid NOT NULL REFERENCES ambassadors(id),
  percent           integer NOT NULL CHECK (percent BETWEEN 1 AND 50),
  max_uses          integer CHECK (max_uses IS NULL OR max_uses > 0),
  uses              integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  per_client_limit  integer NOT NULL DEFAULT 1 CHECK (per_client_limit > 0),
  valid_until       date,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (max_uses IS NULL OR uses <= max_uses)
);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_ci ON promo_codes (upper(code));

-- Link visits: no cookie, no IP, no user agent stored; bots are not counted.
CREATE TABLE IF NOT EXISTS referral_visits (
  id             bigserial PRIMARY KEY,
  ambassador_id  uuid NOT NULL REFERENCES ambassadors(id),
  at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_visits_amb_idx ON referral_visits (ambassador_id, at);

-- Who brought the booking. One row per appointment, written in the booking transaction.
CREATE TABLE IF NOT EXISTS booking_attributions (
  appointment_id  uuid PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  ambassador_id   uuid NOT NULL REFERENCES ambassadors(id),
  promo_code_id   uuid REFERENCES promo_codes(id),
  via             text NOT NULL CHECK (via IN ('LINK', 'CODE', 'LINK_AND_CODE')),
  has_conflict    boolean NOT NULL DEFAULT false,   -- link of one creator + code of another
  is_new_client   boolean NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Discount actually given at the till (pay at the shop). One per appointment.
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id   uuid NOT NULL REFERENCES promo_codes(id),
  appointment_id  uuid NOT NULL UNIQUE REFERENCES appointments(id),
  client_id       uuid REFERENCES clients(id),
  discount_cents  integer NOT NULL CHECK (discount_cents >= 0),
  created_by      uuid REFERENCES staff(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Ambassador program phases 4-7 (spec 010).
-- 4. Service allowances: N free services, proposed then approved by a human. Balances come from an
--    append-only ledger only.
CREATE TABLE IF NOT EXISTS service_allowances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id  uuid NOT NULL REFERENCES ambassadors(id),
  service_id     uuid REFERENCES services(id),          -- NULL = any service
  quantity       integer NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  valid_until    date,
  status         text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED')),
  proposed_by    uuid REFERENCES staff(id),
  decided_by     uuid REFERENCES staff(id),
  decided_at     timestamptz,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS allowance_ledger (
  id               bigserial PRIMARY KEY,
  allowance_id     uuid NOT NULL REFERENCES service_allowances(id),
  kind             text NOT NULL CHECK (kind IN ('ALLOCATION', 'CONSUMPTION', 'EXPIRATION', 'ADJUSTMENT', 'REVERSAL')),
  qty              integer NOT NULL CHECK (qty <> 0),   -- signed: + gives credit, - takes it
  appointment_id   uuid REFERENCES appointments(id),
  reverses_id      bigint REFERENCES allowance_ledger(id),
  idempotency_key  text NOT NULL UNIQUE,
  reason           text,
  created_by       uuid REFERENCES staff(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;
DROP TRIGGER IF EXISTS allowance_ledger_append_only ON allowance_ledger;
CREATE TRIGGER allowance_ledger_append_only BEFORE UPDATE OR DELETE ON allowance_ledger FOR EACH ROW EXECUTE FUNCTION forbid_change();

-- 5. Deliverables and scoring.
CREATE TABLE IF NOT EXISTS deliverables (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id  uuid NOT NULL REFERENCES ambassadors(id),
  kind           text NOT NULL CHECK (kind IN ('REEL', 'POST', 'STORY', 'TIKTOK', 'AUTRE')),
  title          text NOT NULL,
  due_date       date,
  status         text NOT NULL DEFAULT 'EXPECTED' CHECK (status IN ('EXPECTED', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  url            text,
  submitted_at   timestamptz,
  reviewed_by    uuid REFERENCES staff(id),
  reviewed_at    timestamptz,
  review_note    text,
  created_by     uuid REFERENCES staff(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS score_assessments (
  id               bigserial PRIMARY KEY,
  ambassador_id    uuid NOT NULL REFERENCES ambassadors(id),
  phase            text NOT NULL CHECK (phase IN ('POTENTIAL', 'PERFORMANCE')),
  criteria         jsonb NOT NULL,       -- {"audience": 20, "engagement": null, ...}; null = not assessed
  score            numeric(5,1),         -- /100 on assessed criteria
  recommendation   text,
  override_reason  text,
  created_by       uuid REFERENCES staff(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS score_assessments_append_only ON score_assessments;
CREATE TRIGGER score_assessments_append_only BEFORE UPDATE OR DELETE ON score_assessments FOR EACH ROW EXECUTE FUNCTION forbid_change();

-- 7. Creator portal: personal secret link (only its SHA-256 is stored) exchanged for a 30-day session.
ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS portal_token_hash text UNIQUE;
ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS portal_token_at timestamptz;
CREATE TABLE IF NOT EXISTS ambassador_sessions (
  id_hash        text PRIMARY KEY,
  ambassador_id  uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 8. Packs (abonnements) payés en ligne via FlexPay — spec 012. Désactivé sur le site (SALON.features.memberships).
DO $$ BEGIN
  CREATE TYPE membership_payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS membership_payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text NOT NULL UNIQUE,           -- FlexPay orderNumber (webhook correlation key)
  reference           text UNIQUE,                    -- our reference sent to FlexPay
  provider_reference  text,
  plan_code           text NOT NULL,
  amount_cents        integer NOT NULL CHECK (amount_cents > 0),
  currency            text NOT NULL,
  method              text CHECK (method IN ('MOBILE_MONEY', 'CARD')),
  status              membership_payment_status NOT NULL DEFAULT 'PENDING',
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  legacy_id           text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);
CREATE INDEX IF NOT EXISTS membership_payments_created_idx ON membership_payments (created_at DESC);
CREATE TABLE IF NOT EXISTS client_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  plan_code   text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL CHECK (ends_at > starts_at),
  payment_id  uuid UNIQUE REFERENCES membership_payments(id),
  legacy_id   text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_memberships_client_idx ON client_memberships (client_id, ends_at DESC);
