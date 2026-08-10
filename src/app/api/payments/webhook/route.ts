import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/../generated/prisma/client';
import prisma from '@/lib/prisma';
import { createSubscription, getPlanDefinition, isPlanName } from '@/domains/subscription/subscribe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // FlexPay renvoie "code": "0" pour un succès[cite: 1, 2]
    if (body.code !== "0") {
      console.log('FlexPay transaction failed or pending', body);
      return NextResponse.json({ received: true });
    }

    const { reference, provider_reference, orderNumber } = body;
    if (!reference || !orderNumber) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    // Extraction des IDs encodés dans la référence (ex: HAG_clientId_planId_timestamp)
    const parts = reference.split('_');
    if (parts.length < 4 || parts[0] !== 'HAG') {
      return NextResponse.json({ error: 'Référence inconnue' }, { status: 400 });
    }

    const clientId = parts[1];
    const planId = parts[2];

    const [client, plan, alreadyProcessed] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
      prisma.payment.findUnique({ where: { flexpayOrderNumber: orderNumber } }), // Remplacer stripeEventId par flexpayOrderNumber dans ta BD
    ]);

    if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true });
    if (!client || !plan || !isPlanName(plan.name)) {
      return NextResponse.json({ error: 'Checkout plan or client is invalid.' }, { status: 400 });
    }

    const expected = getPlanDefinition(plan.name);
    if (plan.price !== expected.price || plan.durationDays !== expected.durationDays) {
      return NextResponse.json({ error: 'Plan mismatch.' }, { status: 400 });
    }

    const subscription = createSubscription(client, plan.name, new Date());
    
    await prisma.$transaction(async (transaction) => {
      await transaction.payment.create({
        data: { 
          flexpayOrderNumber: orderNumber, // Modification du schéma Prisma recommandée
          providerReference: provider_reference, 
          amount: plan.price, 
          currency: 'USD', 
          clientId, 
          planId 
        },
      });
      await transaction.client.update({ where: { id: clientId }, data: { planId, planEndsAt: subscription.endDate } });
      await transaction.lotteryTicket.createMany({ data: subscription.lotteryTickets.map((ticketNum) => ({ ticketNum, drawDate: subscription.endDate, clientId })) });
    });

    return NextResponse.json({ received: true });
    
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}