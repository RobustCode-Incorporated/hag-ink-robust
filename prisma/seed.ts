import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  DEVELOPMENT_BARBERS,
  DEVELOPMENT_CLIENT,
  DEVELOPMENT_EXPENSES,
  DEVELOPMENT_PLANS,
  DEVELOPMENT_SERVICES,
} from './development-data';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est obligatoire pour exécuter le seed de développement.');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await prisma.$transaction(async (transaction) => {
    for (const plan of DEVELOPMENT_PLANS) {
      await transaction.plan.upsert({
        where: { id: plan.id },
        create: plan,
        update: {
          name: plan.name,
          price: plan.price,
          durationDays: plan.durationDays,
          features: plan.features,
        },
      });
    }

    await transaction.client.upsert({
      where: { id: DEVELOPMENT_CLIENT.id },
      create: DEVELOPMENT_CLIENT,
      update: DEVELOPMENT_CLIENT,
    });

    for (const barber of DEVELOPMENT_BARBERS) {
      await transaction.barber.upsert({
        where: { id: barber.id },
        create: barber,
        update: barber,
      });
    }

    for (const service of DEVELOPMENT_SERVICES) {
      await transaction.service.upsert({
        where: { id: service.id },
        create: service,
        update: service,
      });
    }

    for (const expense of DEVELOPMENT_EXPENSES) {
      await transaction.expense.upsert({
        where: { id: expense.id },
        create: expense,
        update: expense,
      });
    }
  });

  console.log('Development data is ready: plans, client, barbers, services, and expenses were upserted.');
}

main()
  .catch((error: unknown) => {
    console.error('Development seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
