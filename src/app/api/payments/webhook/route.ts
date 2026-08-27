import { NextRequest, NextResponse } from 'next/server';
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

    const { provider_reference, orderNumber } = body;
    if (!orderNumber) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    // Le Payment (statut PENDING) a été créé lors de l'initialisation du checkout,
    // avec l'orderNumber renvoyé par FlexPay comme clé de corrélation.
    const payment = await prisma.payment.findUnique({
      where: { flexpayOrderNumber: orderNumber },
      include: { client: true, plan: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Transaction inconnue' }, { status: 400 });
    }
    if (payment.status !== 'PENDING') {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const { client, plan } = payment;
    if (!isPlanName(plan.name)) {
      return NextResponse.json({ error: 'Checkout plan or client is invalid.' }, { status: 400 });
    }

    const expected = getPlanDefinition(plan.name);
    if (plan.price !== expected.price || plan.durationDays !== expected.durationDays) {
      return NextResponse.json({ error: 'Plan mismatch.' }, { status: 400 });
    }

    // Bascule atomique PENDING -> PAID : si un autre appel concurrent l'a déjà fait, count === 0.
    const claim = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PAID', providerReference: provider_reference ?? null },
    });
    if (claim.count === 0) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const subscription = createSubscription(client, plan.name, new Date());

    await prisma.$transaction(async (transaction) => {
      await transaction.client.update({ where: { id: client.id }, data: { planId: plan.id, planEndsAt: subscription.endDate } });
      await transaction.lotteryTicket.createMany({ data: subscription.lotteryTickets.map((ticketNum) => ({ ticketNum, drawDate: subscription.endDate, clientId: client.id })) });
    });

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}