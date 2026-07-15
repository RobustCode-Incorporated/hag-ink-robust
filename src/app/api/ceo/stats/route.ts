import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'all';

  const dateFilter = new Date();
  if (period === 'month') dateFilter.setDate(dateFilter.getDate() - 30);
  if (period === 'week') dateFilter.setDate(dateFilter.getDate() - 7);

  try {
    // 1. Appliquer le filtre de date sur la récupération des données
    const where = period === 'all' ? {} : { createdAt: { gte: dateFilter } };

    const [services, expenses] = await Promise.all([
      prisma.service.findMany({ where, include: { barber: true }, orderBy: { createdAt: 'desc' } }),
      prisma.expense.findMany({ where, include: { user: true } }) // On filtre aussi les dépenses par période
    ]);

    // 2. Calculs sur les données déjà FILTRÉES
    const totalRevenue = services.reduce((acc, s) => acc + s.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    
    const perfByBarber = services.reduce((acc: any, s) => {
      const name = s.barber?.firstName || 'Inconnu';
      acc[name] = (acc[name] || 0) + s.amount;
      return acc;
    }, {});

    const monthlyData = services.reduce((acc: any, s) => {
      const month = new Date(s.createdAt).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + s.amount;
      return acc;
    }, {});

    return NextResponse.json({
      kpi: { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, totalServices: services.length },
      barberPerformance: Object.entries(perfByBarber).map(([name, val]) => ({ name, val })),
      monthlyRevenue: Object.entries(monthlyData).map(([name, val]) => ({ name, val })),
      latestServices: services.map(s => ({
        id: s.id,
        barber: s.barber?.firstName || 'Inconnu',
        amount: s.amount,
        createdAt: new Date(s.createdAt).toLocaleDateString('fr-FR')
      })),
      latestExpenses: expenses.slice(0, 6).map(e => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        createdAt: new Date(e.createdAt).toLocaleDateString('fr-FR'),
        user: e.user ? `${e.user.email}` : 'Système'
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}