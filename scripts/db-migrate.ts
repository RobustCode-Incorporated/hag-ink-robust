// Applies database/schema.sql (idempotent). Usage: npm run db:migrate
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(readFileSync(join(process.cwd(), 'database/schema.sql'), 'utf8'));
    console.log('Schema applied.');
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
