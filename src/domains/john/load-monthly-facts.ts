import prisma from '@/lib/prisma';
import { buildMonthlyFacts, monthKeyShift, type JohnFacts } from './monthly-facts';

export const HAG_INK_BUSINESS: JohnFacts['business'] = { name: 'Hag & Ink', sector: 'salon', currency: 'USD', locale: 'fr-CD' };

function monthStart(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export async function loadMonthlyFacts(periodKey: string): Promise<JohnFacts> {
  const from = monthStart(monthKeyShift(periodKey, -5));
  const to = monthStart(monthKeyShift(periodKey, 1));
  const [barbers, services, expenses] = await Promise.all([
    prisma.barber.findMany({ orderBy: [{ firstName: 'asc' }] }),
    prisma.service.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { barberId: true, amount: true, createdAt: true } }),
    prisma.expense.findMany({ where: { createdAt: { lt: to } }, select: { amount: true, description: true, isValidated: true, createdAt: true } }),
  ]);
  return buildMonthlyFacts({
    periodKey,
    business: HAG_INK_BUSINESS,
    barbers,
    services: services.map((s) => ({ ...s, amount: Number(s.amount) })),
    expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
  });
}
