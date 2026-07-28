import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type DrawBody = {
  month?: unknown;
  winnersCount?: unknown;
};

const PRIZES = [
  '1er Prix: Journee Spa',
  '2e Prix: Diner Gastronomique',
  '3e Prix: Brunch de Luxe',
  '4e Prix: Seance photo professionnelle',
  '5e Prix: Pack Barber VIP',
  '6e Prix: Bon d\'achat boutique partenaire',
  '7e Prix: Acces gratuit evenement',
  '8e Prix: Massage relaxant 60 minutes',
  '9e Prix: Journee piscine + dejeuner',
  '10e Prix: Un mois de Membership offert',
];

function monthRange(monthText?: string): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (!monthText) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    return { start, end, label };
  }

  const match = monthText.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error('Le format month doit etre YYYY-MM.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error('Le mois doit etre compris entre 01 et 12.');
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end, label: `${year}-${String(month).padStart(2, '0')}` };
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get('month') ?? undefined;
    const range = monthRange(month);

    const winners = await prisma.lotteryTicket.findMany({
      where: {
        drawDate: { gte: range.start, lt: range.end },
        isWinner: true,
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      month: range.label,
      winners: winners.map((winner, index) => ({
        rank: index + 1,
        prize: PRIZES[index] ?? `Prix ${index + 1}`,
        ticketNum: winner.ticketNum,
        client: winner.client,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de lister les gagnants.' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DrawBody;
    const monthText = typeof body.month === 'string' ? body.month : undefined;
    const requestedWinners = typeof body.winnersCount === 'number' ? Math.floor(body.winnersCount) : 10;
    const winnersCount = Math.min(Math.max(requestedWinners, 1), 10);

    const range = monthRange(monthText);

    const existingWinners = await prisma.lotteryTicket.findMany({
      where: {
        drawDate: { gte: range.start, lt: range.end },
        isWinner: true,
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existingWinners.length > 0) {
      return NextResponse.json(
        {
          error: `Le tirage ${range.label} a deja ete effectue.`,
          month: range.label,
          winners: existingWinners.map((winner, index) => ({
            rank: index + 1,
            prize: PRIZES[index] ?? `Prix ${index + 1}`,
            ticketNum: winner.ticketNum,
            client: winner.client,
          })),
        },
        { status: 409 },
      );
    }

    const eligibleTickets = await prisma.lotteryTicket.findMany({
      where: {
        drawDate: { gte: range.start, lt: range.end },
        isWinner: false,
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    if (eligibleTickets.length === 0) {
      return NextResponse.json(
        { error: `Aucun ticket eligible pour ${range.label}.` },
        { status: 404 },
      );
    }

    shuffleInPlace(eligibleTickets);

    const selected = [] as Array<(typeof eligibleTickets)[number]>;
    const winnerClients = new Set<string>();

    for (const ticket of eligibleTickets) {
      if (winnerClients.has(ticket.clientId)) continue;
      selected.push(ticket);
      winnerClients.add(ticket.clientId);
      if (selected.length >= winnersCount) break;
    }

    if (selected.length === 0) {
      return NextResponse.json(
        { error: `Impossible de selectionner des gagnants uniques pour ${range.label}.` },
        { status: 409 },
      );
    }

    await prisma.lotteryTicket.updateMany({
      where: {
        id: { in: selected.map((ticket) => ticket.id) },
      },
      data: { isWinner: true },
    });

    return NextResponse.json({
      month: range.label,
      winnersCount: selected.length,
      winners: selected.map((winner, index) => ({
        rank: index + 1,
        prize: PRIZES[index] ?? `Prix ${index + 1}`,
        ticketNum: winner.ticketNum,
        client: winner.client,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Le tirage a echoue.' },
      { status: 400 },
    );
  }
}
