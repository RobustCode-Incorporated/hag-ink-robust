import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createService } from '@/domains/services/create-service';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('barberId' in body) || !('amount' in body) || typeof body.barberId !== 'string' || typeof body.amount !== 'number') {
      return NextResponse.json({ error: 'barberId and amount are required.' }, { status: 400 });
    }
    const service = await createService({ barberId: body.barberId, amount: body.amount }, {
      barberExists: async (id) => Boolean(await prisma.barber.findUnique({ where: { id } })),
      save: (input) => prisma.service.create({ data: input }),
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record service.';
    const status = message === 'Barber not found.' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
