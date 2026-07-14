import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  activateSubscription,
  ClientNotFoundError,
  PlanConfigurationError,
  type MembershipRepository,
} from '@/domains/subscription/activate-subscription';
import { isPlanName } from '@/domains/subscription/subscribe';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
}

const prisma = globalForPrisma.prisma;

function membershipRepository(): MembershipRepository {
  return {
    findClient: (clientId) => prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true },
    }),
    findPlan: (planName) => prisma.plan.findFirst({
      where: { name: planName },
      select: { id: true, name: true, price: true, durationDays: true },
    }),
    activateMembership: async ({ clientId, planId, planEndsAt, tickets }) => {
      await prisma.$transaction(async (transaction) => {
        await transaction.client.update({
          where: { id: clientId },
          data: { planId, planEndsAt },
        });
        await transaction.lotteryTicket.createMany({
          data: tickets.map((ticket) => ({ ...ticket, clientId })),
        });
      });
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('clientId' in body) ||
      !('planName' in body) ||
      typeof body.clientId !== 'string' ||
      !isPlanName(body.planName)
    ) {
      return NextResponse.json(
        { error: 'Les paramètres clientId et planName valide sont obligatoires.' },
        { status: 400 },
      );
    }

    const subscription = await activateSubscription(
      { clientId: body.clientId, planName: body.planName },
      membershipRepository(),
    );

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PlanConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('Subscription checkout failed:', error);
    return NextResponse.json(
      { error: 'Échec critique lors du traitement de l’abonnement.' },
      { status: 500 },
    );
  }
}
