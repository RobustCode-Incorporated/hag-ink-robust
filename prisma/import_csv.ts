import { PrismaClient } from '@prisma/client';
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
          
          await prisma.service.create({
            data: {
              barberId: row.userId,
              managerId: MANAGER_ID,
              amount: parseFloat(row.Montant),
              description: `Prestation importée - Com: ${row.isFixedSalary}$`,
              createdAt: date,
            },
          });
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