import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loadMonthlyFacts } from '@/domains/john/load-monthly-facts';
import { sessionEmail } from '@/lib/john';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET() {
  const reports = await prisma.johnReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, kind: true, periodKey: true, status: true, error: true, durationSec: true, createdAt: true, finishedAt: true },
  });
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const email = await sessionEmail(request);
  if (!email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const periodKey = typeof body.period === 'string' ? body.period : '';
  if (!MONTH.test(periodKey)) return NextResponse.json({ error: 'Période invalide (AAAA-MM).' }, { status: 400 });
  const now = new Date();
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  if (periodKey > current) return NextResponse.json({ error: 'Ce mois n’a pas encore commencé.' }, { status: 400 });

  const busy = await prisma.johnReport.findFirst({ where: { kind: 'MONTHLY', periodKey, status: { in: ['QUEUED', 'RUNNING'] } } });
  if (busy) return NextResponse.json({ report: busy, reused: true });

  const language = body.language === 'en' ? 'en' : 'fr';
  const facts = await loadMonthlyFacts(periodKey, language);
  const report = await prisma.johnReport.create({
    data: { kind: 'MONTHLY', periodKey, facts, requestedBy: email },
    select: { id: true, kind: true, periodKey: true, status: true, createdAt: true },
  });
  return NextResponse.json({ report }, { status: 201 });
}
