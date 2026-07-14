import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'all';

  const filters: any = {};
  if (period === 'month') {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - 30);
    filters.createdAt = { gte: dateFilter };
  }
  if (period === 'week') {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - 7);
    filters.createdAt = { gte: dateFilter };
  }

  const expenses = await prisma.expense.findMany({
    where: filters,
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return NextResponse.json({
    kpi: { totalExpenses, totalCount: expenses.length },
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      description: expense.description,
      createdAt: expense.createdAt,
      user: expense.user ? expense.user.email : 'Système',
    })),
  });
}
