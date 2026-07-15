import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';



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
