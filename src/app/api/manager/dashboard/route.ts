import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function GET() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const expenseFilter = {
    createdAt: { gte: start },
    NOT: { user: { role: 'CEO' } },
  } as const;
  const [barbers, todayServices, recentServices, todayExpenses] = await Promise.all([
    prisma.barber.findMany({ orderBy: [{ firstName: 'asc' }] }),
    prisma.service.findMany({ where: { createdAt: { gte: start } }, include: { barber: true } }),
    prisma.service.findMany({ take: 12, orderBy: { createdAt: 'desc' }, include: { barber: true } }),
    prisma.expense.findMany({ where: expenseFilter, include: { user: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  const todayRevenue = todayServices.reduce((sum, service) => sum + service.amount, 0);
  const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netRevenue = todayRevenue - totalExpenses;
  const barberRevenue = todayServices.reduce<Record<string, number>>((totals, service) => {
    totals[service.barberId] = (totals[service.barberId] ?? 0) + service.amount;
    return totals;
  }, {});
  return NextResponse.json({
    kpi: { todayRevenue, todayServices: todayServices.length, activeBarbers: new Set(todayServices.map((service) => service.barberId)).size, totalExpenses, netRevenue },
    barbers: barbers.map((barber) => ({ id: barber.id, name: `${barber.firstName} ${barber.lastName}`, todayRevenue: barberRevenue[barber.id] ?? 0 })),
    recentServices: recentServices.map((service) => ({ id: service.id, amount: service.amount, createdAt: service.createdAt, barber: `${service.barber.firstName} ${service.barber.lastName}` })),
    expenses: todayExpenses.map((expense) => ({ id: expense.id, amount: expense.amount, description: expense.description, createdAt: expense.createdAt, user: expense.user ? expense.user.email : 'Système' })),
  });
}
