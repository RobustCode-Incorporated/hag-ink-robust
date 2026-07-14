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
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Payload invalid.' }, { status: 400 });
    }

    const {
      role,
      email,
      password,
      firstName,
      lastName,
      phone,
    } = body as {
      role?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    if (!role || !['MANAGER', 'BARBER', 'CLEANER'].includes(role)) {
      return NextResponse.json({ error: 'role must be MANAGER, BARBER or CLEANER.' }, { status: 400 });
    }

    if (role === 'MANAGER') {
      if (!email || !password || !phone) {
        return NextResponse.json({ error: 'email, password and phone are required for managers.' }, { status: 400 });
      }

      const manager = await prisma.user.create({
        data: {
          email,
          password,
          role: 'MANAGER',
        },
      });

      return NextResponse.json(manager, { status: 201 });
    }

    if (role === 'CLEANER') {
      if (!firstName || !lastName || !phone) {
        return NextResponse.json({ error: 'firstName, lastName and phone are required for cleaners.' }, { status: 400 });
      }

      const effectiveEmail = `${firstName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${lastName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Math.floor(Math.random() * 9000 + 1000)}@cleaner.hagink.local`;

      const cleaner = await prisma.user.create({
        data: {
          email: effectiveEmail,
          password: '',
          role: 'CLEANER',
        },
      });

      return NextResponse.json(cleaner, { status: 201 });
    }

    if (role === 'BARBER') {
      if (!email) {
        return NextResponse.json({ error: 'email is required for barbers.' }, { status: 400 });
      }

      const namePart = email.split('@')[0] || 'barber-user';
      const parts = namePart.split(/[,._-]+/).filter(Boolean);
      const barberFirstName = parts[0] || 'Barber';
      const barberLastName = parts.slice(1).join(' ') || 'User';

      const barber = await prisma.barber.create({
        data: {
          firstName: barberFirstName,
          lastName: barberLastName,
          phone: '',
          commissionRate: 0.25,
          salaryType: 'COMMISSION',
          user: {
            create: {
              email,
              password: '',
              role: 'BARBER',
            },
          },
        },
      });

      return NextResponse.json(barber, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported role.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create user.' }, { status: 500 });
  }
}
