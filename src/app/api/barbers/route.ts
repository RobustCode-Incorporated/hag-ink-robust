import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function GET() {
  const barbers = await prisma.barber.findMany({ orderBy: [{ firstName: 'asc' }] });
  return NextResponse.json(barbers);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
    }

    const { firstName, lastName, phone, commissionRate, salaryType } = payload as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      commissionRate?: number;
      salaryType?: string;
    };

    if (!firstName || !lastName || typeof phone !== 'string') {
      return NextResponse.json({ error: 'firstName, lastName and phone are required.' }, { status: 400 });
    }

    const barber = await prisma.barber.create({
      data: {
        firstName,
        lastName,
        phone,
        commissionRate: typeof commissionRate === 'number' ? commissionRate : 0.25,
        salaryType: salaryType ?? 'COMMISSION',
      },
    });

    return NextResponse.json(barber, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create barber.' }, { status: 500 });
  }
}
