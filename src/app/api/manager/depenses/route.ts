import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function GET() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const todayExpenses = await prisma.expense.findMany({
    where: {
      createdAt: { gte: start },
      OR: [
        { user: { role: { not: 'CEO' } } },
        { userId: null },
      ],
    },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return NextResponse.json({
    kpi: { totalExpenses, totalCount: todayExpenses.length },
    expenses: todayExpenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      description: expense.description,
      createdAt: expense.createdAt,
      user: expense.user ? expense.user.email : 'Système',
    })),
  });
}
