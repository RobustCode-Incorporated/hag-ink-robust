import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import Stripe from 'stripe';
import { createSubscription, getPlanDefinition, isPlanName } from '@/domains/subscription/subscribe';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
      await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });
  const session = event.data.object;
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

  const { clientId, planId, planName } = session.metadata ?? {};
  if (!clientId || !planId || !isPlanName(planName)) {
    return NextResponse.json({ error: 'Checkout metadata is incomplete.' }, { status: 400 });
  }

  const [client, plan, alreadyProcessed] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
    prisma.payment.findUnique({ where: { stripeEventId: event.id } }),
  ]);
  if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true });
  const expected = getPlanDefinition(planName);
  if (!client || !plan || plan.name !== planName || plan.price !== expected.price || plan.durationDays !== expected.durationDays) {
    return NextResponse.json({ error: 'Checkout plan or client is invalid.' }, { status: 400 });
  }

  const subscription = createSubscription(client, planName, new Date());
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.payment.create({
        data: { stripeSessionId: session.id, stripeEventId: event.id, amount: session.amount_total ?? Math.round(plan.price * 100), currency: session.currency ?? 'usd', clientId, planId },
      });
      await transaction.client.update({ where: { id: clientId }, data: { planId, planEndsAt: subscription.endDate } });
      await transaction.lotteryTicket.createMany({ data: subscription.lotteryTickets.map((ticketNum) => ({ ticketNum, drawDate: subscription.endDate, clientId })) });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw error;
  }

  return NextResponse.json({ received: true });
}
