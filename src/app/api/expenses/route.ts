import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof body.amount !== 'number' ||
      body.amount <= 0 ||
      typeof body.description !== 'string' ||
      !body.description.trim()
    ) {
      return NextResponse.json({ error: 'amount and description are required.' }, { status: 400 });
    }

    let userId: string | null = null;
    if (body.role === 'CEO') {
      const ceo = await prisma.user.findFirst({ where: { role: 'CEO' } });
      if (!ceo) {
        return NextResponse.json({ error: 'CEO user not found.' }, { status: 404 });
      }
      userId = ceo.id;
    } else if (body.role === 'MANAGER') {
      const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } });
      if (!manager) {
        return NextResponse.json({ error: 'Manager user not found.' }, { status: 404 });
      }
      userId = manager.id;
    }

    const expense = await prisma.expense.create({
      data: {
        amount: body.amount,
        description: body.description.trim(),
        userId,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to report expense.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
