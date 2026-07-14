const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function parseFrenchDate(dateStr) {
  const months = { 'janv.':0,'févr.':1,'mars':2,'avr.':3,'mai':4,'juin':5,'juil.':6,'août':7,'sept.':8,'oct.':9,'nov.':10,'déc.':11 };
  if (!dateStr) return null;
  const parts = dateStr.replace(',', '').split(' ');
  const month = months[parts[0]?.toLowerCase()];
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, month, day);
}

async function main() {
  const filePath = path.join(process.cwd(), 'barberprestationHag&ink.csv');
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (r) => rows.push(r))
      .on('end', resolve)
      .on('error', reject);
  });

  const limit = Number(process.env.PREVIEW_LIMIT || 20);
  console.log('Loaded', rows.length, 'rows - preview limit', limit);

  let i = 0;
  for (const row of rows.slice(0, limit)) {
    i++;
    try {
      const date = parseFrenchDate(row.Date);
      if (!date) throw new Error('invalid date: ' + row.Date);
      const barberId = String(row.userId || '').trim();
      if (!barberId) throw new Error('missing barber id');
      const amount = Number(String(row.Montant || '').replace(/[^0-9.-]+/g,''));
      if (Number.isNaN(amount)) throw new Error('invalid amount: ' + row.Montant);

      const barber = await prisma.barber.upsert({ where: { id: barberId }, create: { id: barberId, firstName: row.firstName || 'Import', lastName: row.lastName || 'Import', phone: null, commissionRate: Number(row.commissionRate) || 0.25, salaryType: 'COMMISSION' }, update: {} });
      console.log(`#${i} ensured barber ${barber.id}`);

      const svc = await prisma.service.create({ data: { barberId: barber.id, amount, createdAt: date } });
      console.log(`#${i} created service ${svc.id} amount=${amount} date=${date.toISOString().slice(0,10)}`);

      // rollback for preview: delete created service but keep barber
      await prisma.service.delete({ where: { id: svc.id } });
      console.log(`#${i} rolled back service ${svc.id}`);
    } catch (err) {
      console.error(`#${i} error:`, err.message || err);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
