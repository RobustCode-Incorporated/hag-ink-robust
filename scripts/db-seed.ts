// Idempotent seed: the salon's real catalogue (Planity, Oct 2026), hours and team.
// Creates the owner login if missing and prints its one-time password.
// Usage: OWNER_EMAIL=... npm run db:seed   (OWNER_EMAIL required)
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { SALON } from '../src/config/salon';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');

    for (const [weekday, h] of SALON.openingHours.entries()) {
      await client.query(
        `INSERT INTO opening_hours (weekday, opens, closes) VALUES ($1, $2, $3)
         ON CONFLICT (weekday) DO NOTHING`,
        [weekday, h?.opens ?? null, h?.closes ?? null],
      );
    }

    for (const [i, s] of SALON.seedServices.entries()) {
      await client.query(
        `INSERT INTO services (slug, category, name_fr, name_es, name_nl, name_en, note_fr, duration_min, price_cents, allowed_days, online, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (slug) DO NOTHING`,
        [s.slug, s.category, s.name.fr, s.name.es, s.name.nl, s.name.en, s.note ?? null,
         s.durationMin, s.priceCents, s.allowedDays ?? null, s.online ?? true, i],
      );
    }

    for (const [i, b] of SALON.seedTeam.entries()) {
      const exists = await client.query('SELECT 1 FROM staff WHERE display_name = $1', [b.name]);
      if (exists.rowCount) continue;
      await client.query(
        `INSERT INTO staff (display_name, role, instagram, bookable, sort) VALUES ($1, 'BARBER', $2, true, $3)`,
        [b.name, b.instagram ?? null, i + 1],
      );
    }

    for (const p of SALON.seedProducts) {
      await client.query(
        `INSERT INTO products (name, sku, price_cents, purchase_cents, stock_qty) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (sku) DO NOTHING`,
        [p.name, p.sku, p.priceCents, p.purchaseCents, p.stock],
      );
    }

    if (!process.env.OWNER_EMAIL) throw new Error('OWNER_EMAIL is required');
    const ownerEmail = process.env.OWNER_EMAIL.toLowerCase();
    const owner = await client.query('SELECT 1 FROM staff WHERE email = $1', [ownerEmail]);
    let password: string | null = null;
    if (!owner.rowCount) {
      password = randomBytes(9).toString('base64url');
      await client.query(
        `INSERT INTO staff (display_name, role, email, password_hash, bookable, pay_type, commission_rate, sort)
         VALUES ('Direction', 'OWNER', $1, $2, false, 'FIXED', 0, 0)`,
        [ownerEmail, await bcrypt.hash(password, 12)],
      );
    }

    await client.query('COMMIT');
    console.log('Seed done.');
    if (password) console.log(`OWNER LOGIN  ${ownerEmail}  /  ${password}   (shown once — change it in Équipe)`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
