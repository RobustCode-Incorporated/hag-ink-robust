import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function GET() {
  const cleaners = await prisma.user.findMany({ where: { role: 'CLEANER' } });
  return NextResponse.json(cleaners);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
    }

    const { email, password, firstName, lastName } = payload as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'email, password, firstName and lastName are required.' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password,
        role: 'CLEANER',
      },
    });

    return NextResponse.json({ ...user, firstName, lastName }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create cleaner.' }, { status: 500 });
  }
}
