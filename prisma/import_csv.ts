import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import * as dotenv from 'dotenv';

dotenv.config();

// Fonction pour convertir "nov. 23, 2024" en Date JS
function parseFrenchDate(dateStr: string): Date {
  // Mapping simplifié des mois en français
  const months: { [key: string]: number } = {
    'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
    'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
  };
  
  const parts = dateStr.replace(',', '').split(' ');
  const month = months[parts[0].toLowerCase()];
  const day = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../barberprestationHag&ink.csv');
  const MANAGER_ID = '92890da1-7466-43e6-8c49-e1d97acb99a0';

  console.log('🚀 Démarrage de l\'importation avec conversion des dates...');

  const results: any[] = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let successCount = 0;
      for (const row of results) {
        try {
          const date = parseFrenchDate(row.Date);
          if (!date) {
            throw new Error(`Date invalide: ${row.Date}`);
          }

          const barberId = String(row.userId || '').trim();
          if (!barberId) {
            throw new Error('Barber userId manquant');
          }

          // Ensure barber exists (use upsert to be idempotent)
          const barber = await prisma.barber.upsert({
            where: { id: barberId },
            create: {
              id: barberId,
              firstName: String(row.firstName || 'Unknown'),
              lastName: String(row.lastName || 'Barber'),
              phone: null,
              commissionRate: Number(row.commissionRate) || 0.25,
              salaryType: 'COMMISSION',
            },
            update: {},
          });

          // Validate barber exists before creating service
          if (!barber || barber.id !== barberId) {
            throw new Error(`Failed to ensure barber exists for id=${barberId}`);
          }

          // Parse amount safely
          const amount = Number(String(row.Montant || '').replace(/[^0-9.-]+/g, ''));
          if (Number.isNaN(amount)) {
            throw new Error(`Invalid amount: ${row.Montant}`);
          }

          try {
            await prisma.service.create({
              data: {
                barberId,
                amount,
                createdAt: date,
              },
            });
          } catch (err) {
            // If FK still fails, log barber existence for debugging
            const check = await prisma.barber.findUnique({ where: { id: barberId } });
            console.error('Barber check before failing insert:', !!check, check?.id);
            throw err;
          }
          successCount++;
        } catch (e) {
          console.error(`❌ Échec ligne ${row.Date}:`, e);
        }
      }
      console.log(`✅ Importation terminée. ${successCount} lignes ajoutées.`);
      await prisma.$disconnect();
      await pool.end();
    });
}

main().catch(console.error);