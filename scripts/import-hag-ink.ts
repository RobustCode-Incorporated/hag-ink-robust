// Imports the old Hag & Ink database into this REM database (spec 006).
//
//   OLD_DATABASE_URL=<old, read-only>  DATABASE_URL=<new>  npm run db:import:hag-ink
//
// - Read-only on the old database (one READ ONLY transaction).
// - Idempotent on the new one: every row carries legacy_id = old id (ON CONFLICT DO NOTHING).
// - All-or-nothing: one transaction; any reconciliation mismatch rolls everything back.
// - Owner and manager logins keep their current passwords (old bcrypt hashes are copied).
import 'dotenv/config';
import { Client, types } from 'pg';
import { SALON } from '../src/config/salon';
import {
  reconcile, salonDay, staffFromBarber, toCents,
  type OldBarber, type OldExpense, type OldService,
} from '../src/domain/hag-ink-import';

const HISTORY_SLUG = 'historique-hag-ink';

// The old Prisma columns are `timestamp` WITHOUT time zone holding UTC values. node-pg would read them
// in the machine's local zone (e.g. Brussels) and shift midnight services into the previous month.
types.setTypeParser(1114, (v: string) => new Date(`${v.replace(' ', 'T')}Z`));

type MonthRow = { month: string; count: number; cents: number };
const toTotals = (rows: MonthRow[]) => new Map(rows.map((r) => [r.month, { count: Number(r.count), cents: Number(r.cents) }]));

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const newUrl = process.env.DATABASE_URL;
  if (!oldUrl || !newUrl) throw new Error('OLD_DATABASE_URL and DATABASE_URL are required');
  if (oldUrl === newUrl) throw new Error('OLD_DATABASE_URL and DATABASE_URL must differ');
  const dryRun = process.argv.includes('--dry-run');

  const src = new Client({ connectionString: oldUrl });
  const dst = new Client({ connectionString: newUrl });
  await src.connect();
  await dst.connect();
  try {
    // ---------------------------------------------------------------- read (old)
    await src.query('BEGIN TRANSACTION READ ONLY');
    const barbers = (await src.query<OldBarber>(`SELECT id, "firstName", "lastName", "salaryType", "fixedSalary", "commissionRate", phone FROM "Barber"`)).rows;
    const users = (await src.query<{ id: string; email: string; role: string; password: string }>(`SELECT id, email, role::text, password FROM "User" WHERE role IN ('CEO','MANAGER')`)).rows;
    const clients = (await src.query<{ id: string; firstName: string; lastName: string; phone: string; email: string | null; createdAt: Date; planId: string | null; planEndsAt: Date | null }>(
      `SELECT id, "firstName", "lastName", phone, email, "createdAt", "planId", "planEndsAt" FROM "Client"`)).rows;
    const services = (await src.query<OldService>(`SELECT id, "barberId", "clientId", amount, "createdAt" FROM "Service" ORDER BY "createdAt"`)).rows;
    const expenses = (await src.query<OldExpense>(`SELECT id, amount, description, "isValidated", "createdAt", "userId" FROM "Expense"`)).rows;
    const archive: { kind: string; rows: { id: string }[] }[] = [];
    for (const [kind, table] of [['plan', 'Plan'], ['payment', 'Payment'], ['lottery_ticket', 'LotteryTicket'], ['invoice', 'Invoice']] as const) {
      archive.push({ kind, rows: (await src.query(`SELECT * FROM "${table}"`)).rows });
    }
    await src.query('COMMIT');

    // ---------------------------------------------------------------- write (new)
    await dst.query('BEGIN');
    const service = await dst.query<{ id: string }>(
      `INSERT INTO services (slug, category, name_fr, name_en, duration_min, price_cents, online, active, sort)
       VALUES ($1, 'HISTORIQUE', 'Prestation (historique Hag & Ink)', 'Service (Hag & Ink history)', 30, 0, false, false, 999)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`, [HISTORY_SLUG]);
    const historyServiceId = service.rows[0].id;

    // staff: barbers
    const staffId = new Map<string, string>();
    for (const [i, b] of barbers.entries()) {
      const s = staffFromBarber(b);
      const r = await dst.query<{ id: string }>(
        `INSERT INTO staff (legacy_id, display_name, role, phone, pay_type, commission_rate, fixed_salary_cents, bookable, sort)
         VALUES ($1, $2, 'BARBER', $3, $4, $5, $6, true, $7)
         ON CONFLICT (legacy_id) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`,
        [s.legacyId, s.displayName, s.phone, s.payType, s.commissionRate, s.fixedSalaryCents, 10 + i]);
      staffId.set(b.id, r.rows[0].id);
    }

    // staff: owner (CEO) and manager logins — they keep their current passwords: the old bcrypt hash is
    // copied as-is (both systems use bcrypt), on first import and on every re-run (password changes follow).
    const userStaff = new Map<string, string>();
    for (const u of users) {
      const email = u.email.toLowerCase();
      if (!u.password?.startsWith('$2')) throw new Error(`User ${email}: password is not a bcrypt hash`);
      const role = u.role === 'CEO' ? 'OWNER' : 'MANAGER';
      const existing = await dst.query<{ id: string }>('SELECT id FROM staff WHERE legacy_id = $1 OR email = $2', [u.id, email]);
      if (existing.rowCount) {
        await dst.query('UPDATE staff SET password_hash = $2, email = $3, legacy_id = COALESCE(legacy_id, $4) WHERE id = $1',
          [existing.rows[0].id, u.password, email, u.id]);
        userStaff.set(u.id, existing.rows[0].id);
        continue;
      }
      const r = await dst.query<{ id: string }>(
        `INSERT INTO staff (legacy_id, display_name, role, email, password_hash, bookable, pay_type, commission_rate, sort)
         VALUES ($1, $2, $3, $4, $5, false, 'FIXED', 0, $6) RETURNING id`,
        [u.id, role === 'OWNER' ? 'Direction' : 'Manager', role, email, u.password, role === 'OWNER' ? 0 : 1]);
      userStaff.set(u.id, r.rows[0].id);
    }

    // clients
    const clientId = new Map<string, string>();
    for (const c of clients) {
      const r = await dst.query<{ id: string }>(
        `INSERT INTO clients (legacy_id, first_name, last_name, phone, email, created_at) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (legacy_id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id`,
        [c.id, c.firstName, c.lastName ?? '', c.phone, c.email, c.createdAt]);
      clientId.set(c.id, r.rows[0].id);
    }

    // sales (bulk, one statement per 500 rows)
    for (let i = 0; i < services.length; i += 500) {
      const chunk = services.slice(i, i + 500);
      const missing = chunk.find((s) => !staffId.has(s.barberId));
      if (missing) throw new Error(`Service ${missing.id}: unknown barber ${missing.barberId}`);
      await dst.query(
        `INSERT INTO sales (legacy_id, kind, staff_id, client_id, service_id, amount_cents, payment_method, description, created_at)
         SELECT * FROM unnest($1::text[], $2::text[], $3::uuid[], $4::uuid[], $5::uuid[], $6::int[], $7::payment_method[], $8::text[], $9::timestamptz[])
         ON CONFLICT (legacy_id) DO NOTHING`,
        [chunk.map((s) => s.id), chunk.map(() => 'SERVICE'), chunk.map((s) => staffId.get(s.barberId)),
         chunk.map((s) => (s.clientId ? clientId.get(s.clientId) ?? null : null)), chunk.map(() => historyServiceId),
         chunk.map((s) => toCents(Number(s.amount))), chunk.map(() => 'OTHER'), chunk.map(() => 'Import Hag & Ink'),
         chunk.map((s) => s.createdAt)]);
    }

    // expenses
    for (const e of expenses) {
      await dst.query(
        `INSERT INTO expenses (legacy_id, category, description, amount_cents, spent_on, status, created_by, created_at)
         VALUES ($1, 'AUTRE', $2, $3, $4, $5, $6, $7) ON CONFLICT (legacy_id) DO NOTHING`,
        [e.id, e.description, toCents(Number(e.amount)), salonDay(e.createdAt, SALON.timezone),
         e.isValidated ? 'APPROVED' : 'PENDING', e.userId ? userStaff.get(e.userId) ?? null : null, e.createdAt]);
    }

    // FlexPay pack payments (spec 012): kept in membership_payments so a late webhook still finds its order.
    const plansById = new Map((archive.find((a) => a.kind === 'plan')?.rows ?? []).map((r) => [r.id, (r as unknown as { name: string }).name]));
    for (const row of archive.find((a) => a.kind === 'payment')?.rows ?? []) {
      const pay = row as unknown as { id: string; flexpayOrderNumber: string; providerReference: string | null; amount: number; currency: string; status: string; createdAt: Date; clientId: string; planId: string };
      const cid = clientId.get(pay.clientId);
      if (!cid) throw new Error(`Payment ${pay.id}: unknown client`);
      await dst.query(
        `INSERT INTO membership_payments (legacy_id, order_number, provider_reference, plan_code, amount_cents, currency, status, client_id, created_at, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (legacy_id) DO NOTHING`,
        [pay.id, pay.flexpayOrderNumber, pay.providerReference, plansById.get(pay.planId) ?? pay.planId, toCents(Number(pay.amount)),
         pay.currency, pay.status, cid, new Date(pay.createdAt), pay.status === 'PAID' ? new Date(pay.createdAt) : null]);
    }
    // Running memberships (old Client.planId / planEndsAt).
    for (const c of clients.filter((c) => c.planId && c.planEndsAt && new Date(c.planEndsAt) > new Date())) {
      const cid = clientId.get(c.id)!;
      const end = new Date(c.planEndsAt!);
      const start = new Date(end.getTime()); start.setUTCMonth(start.getUTCMonth() - 1);
      await dst.query(
        `INSERT INTO client_memberships (legacy_id, client_id, plan_code, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (legacy_id) DO NOTHING`,
        [c.id, cid, plansById.get(c.planId!) ?? c.planId, start, end]);
    }

    // archive
    for (const a of archive) {
      for (const row of a.rows) {
        await dst.query(`INSERT INTO legacy_archive (kind, legacy_id, payload) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [a.kind, row.id, JSON.stringify(row)]);
      }
    }

    // tombola tickets (spec 009)
    for (const t of archive.find((a) => a.kind === 'lottery_ticket')?.rows ?? []) {
      const row = t as unknown as { id: string; ticketNum: string; drawDate: Date; isWinner: boolean; clientId: string };
      const cid = clientId.get(row.clientId);
      if (!cid) throw new Error(`Lottery ticket ${row.id}: unknown client`);
      await dst.query(
        `INSERT INTO lottery_tickets (legacy_id, ticket_num, draw_date, client_id, is_winner) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (legacy_id) DO NOTHING`,
        [row.id, row.ticketNum, salonDay(new Date(row.drawDate), SALON.timezone), cid, row.isWinner]);
    }

    // ---------------------------------------------------------------- reconcile
    // Independent check: each database computes its own month totals in SQL (UTC months, like the old treasury page).
    await src.query('BEGIN TRANSACTION READ ONLY');
    const oldSales = toTotals((await src.query<MonthRow>(
      `SELECT to_char("createdAt", 'YYYY-MM') AS month, count(*) AS count, round(sum(amount) * 100) AS cents FROM "Service" GROUP BY 1`)).rows);
    const oldExp = toTotals((await src.query<MonthRow>(
      `SELECT to_char("createdAt", 'YYYY-MM') AS month, count(*) AS count, round(sum(amount) * 100) AS cents FROM "Expense" GROUP BY 1`)).rows);
    await src.query('COMMIT');
    const newSales = toTotals((await dst.query<MonthRow>(
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month, count(*) AS count, sum(amount_cents) AS cents
         FROM sales WHERE legacy_id IS NOT NULL AND voided_at IS NULL GROUP BY 1`)).rows);
    const newExp = toTotals((await dst.query<MonthRow>(
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month, count(*) AS count, sum(amount_cents) AS cents
         FROM expenses WHERE legacy_id IS NOT NULL GROUP BY 1`)).rows);

    console.log('\nMonth     sales old → new (count, USD)           expenses old → new');
    for (const k of [...new Set([...oldSales.keys(), ...oldExp.keys()])].sort()) {
      const so = oldSales.get(k), sn = newSales.get(k), eo = oldExp.get(k), en = newExp.get(k);
      const f = (t?: { count: number; cents: number }) => (t ? `${t.count} / ${(t.cents / 100).toFixed(2)}` : '-');
      console.log(`${k}   ${f(so).padEnd(14)} → ${f(sn).padEnd(14)}   ${f(eo).padEnd(12)} → ${f(en)}`);
    }
    const bad = [...reconcile(oldSales, newSales).map((m) => `sales ${m}`), ...reconcile(oldExp, newExp).map((m) => `expenses ${m}`)];
    if (bad.length) throw new Error(`Reconciliation failed: ${bad.join(', ')}`);
    console.log(`\nOK: ${services.length} sales, ${expenses.length} expenses, ${barbers.length} barbers, ${clients.length} clients, ` +
      `${archive.map((a) => `${a.rows.length} ${a.kind}`).join(', ')} archived.`);

    if (dryRun) {
      await dst.query('ROLLBACK');
      console.log('Dry run: rolled back, nothing written.');
    } else {
      await dst.query('COMMIT');
      console.log(`Logins kept: ${users.map((u) => u.email.toLowerCase()).join(', ')} (same passwords as before).`);
    }
  } catch (e) {
    await dst.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await src.end();
    await dst.end();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
