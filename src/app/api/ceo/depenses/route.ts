import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';



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
