import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';



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
