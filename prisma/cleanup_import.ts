import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../barberprestationHag&ink.csv');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type CsvRow = {
  userId: string;
  Montant: string;
  Date: string;
};

function parseFrenchDate(dateStr: string): Date | null {
  const months: Record<string, number> = {
    'janv.': 0,
    'févr.': 1,
    'mars': 2,
    'avr.': 3,
    'mai': 4,
    'juin': 5,
    'juil.': 6,
    'août': 7,
    'sept.': 8,
    'oct.': 9,
    'nov.': 10,
    'déc.': 11,
  };

  const normalized = String(dateStr).trim().replace(/\s+/g, ' ');
  const parts = normalized.replace(',', '').split(' ');
  if (parts.length !== 3) return null;

  const month = months[parts[0].toLowerCase()];
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;

  const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function deleteImportedServices(rows: CsvRow[]) {
  const uniqueKeys = new Set<string>();
  let totalDeleted = 0;

  for (const row of rows) {
    if (!row.userId || !row.Montant || !row.Date) continue;

    const amount = Number(row.Montant);
    if (Number.isNaN(amount)) continue;

    const createdAt = parseFrenchDate(row.Date);
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      console.warn(`⚠️ Date invalide, ligne ignorée: ${row.Date}`);
      continue;
    }

    const nextDay = new Date(createdAt);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const timestampKey = createdAt.toISOString();
    const key = `${row.userId}|${amount}|${timestampKey}`;
    if (uniqueKeys.has(key)) continue;
    uniqueKeys.add(key);

    const deleted = await prisma.service.deleteMany({
      where: {
        barberId: row.userId,
        amount,
        createdAt: {
          gte: createdAt,
          lt: nextDay,
        },
      },
    });

    totalDeleted += deleted.count;
  }

  return totalDeleted;
}

async function main() {
  console.log('🔎 Recherche des prestations importées depuis barberprestationHag&ink.csv...');

  const results: CsvRow[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: CsvRow) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  const deletedCount = await deleteImportedServices(results);
  console.log(`✅ Suppression terminée. ${deletedCount} prestation(s) supprimée(s).`);
}

main()
  .catch((error) => {
    console.error('❌ Erreur lors de la suppression :', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
