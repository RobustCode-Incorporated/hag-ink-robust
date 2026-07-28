import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type WinnerTicket = {
  ticketNum: string;
  createdAt: Date;
};

function monthLabelFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const tickets = await prisma.lotteryTicket.findMany({
      where: { isWinner: true },
      select: {
        ticketNum: true,
        drawDate: true,
        createdAt: true,
      },
      orderBy: [
        { drawDate: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const grouped = new Map<string, WinnerTicket[]>();

    for (const ticket of tickets) {
      const month = monthLabelFromDate(ticket.drawDate);
      const monthWinners = grouped.get(month) ?? [];
      monthWinners.push({ ticketNum: ticket.ticketNum, createdAt: ticket.createdAt });
      grouped.set(month, monthWinners);
    }

    const monthlyWinners = Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, winners]) => {
        const sortedWinners = [...winners].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return {
          month,
          winningTicket: sortedWinners[0]?.ticketNum ?? null,
          tickets: sortedWinners.map((winner) => winner.ticketNum),
          winnersCount: sortedWinners.length,
        };
      });

    return NextResponse.json({ monthlyWinners });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de charger les gagnants par mois.' },
      { status: 500 },
    );
  }
}
