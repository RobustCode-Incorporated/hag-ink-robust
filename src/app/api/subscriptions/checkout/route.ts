import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createSubscription, PlanName } from '@/domains/subscription/subscribe';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
}
const pool = globalForPrisma.pool;

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}
const prisma = globalForPrisma.prisma;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planName } = body;

    if (!clientId || !planName) {
      return NextResponse.json(
        { error: 'Les paramètres clientId et planName sont obligatoires.' },
        { status: 400 }
      );
    }

    const clientUser = await prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!clientUser) {
      return NextResponse.json(
        { error: `Le client avec l'ID "${clientId}" n'existe pas dans Neon.` },
        { status: 404 }
      );
    }

    const subscriptionBusiness = createSubscription(
      {
        id: clientUser.id,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName || '',
      },
      planName as PlanName,
      new Date()
    );

    // 4. Enregistrement en base : Parfaitement aligné sur ton schema.prisma !
    const savedSubscription = await prisma.subscription.create({
      data: {
        clientId: subscriptionBusiness.clientId,
        planName: subscriptionBusiness.planName,
        pricePaid: subscriptionBusiness.pricePaid,
        planDurationMonths: subscriptionBusiness.planDurationMonths,
        startDate: subscriptionBusiness.startDate,
        endDate: subscriptionBusiness.endDate,
        donationAmount: subscriptionBusiness.donationAmount,
        // Règle Métier : On transforme le tableau de tickets en texte séparé par des virgules
        lotteryTickets: subscriptionBusiness.lotteryTickets.join(', '),
        status: 'ACTIVE',
      },
    });

    // 5. Retour au Frontend (on renvoie le tableau pour que l'UI affiche les badges proprement)
    return NextResponse.json({
      ...savedSubscription,
      lotteryTickets: subscriptionBusiness.lotteryTickets,
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [API CHECKOUT ERROR] :', error);
    return NextResponse.json(
      { error: 'Échec critique lors du traitement de l\'abonnement.', details: error.message },
      { status: 500 }
    );
  }
}