import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import Stripe from 'stripe';
import { getPlanDefinition, isPlanName } from '@/domains/subscription/subscribe';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

type CheckoutBody = { planName: unknown; firstName: unknown; lastName: unknown; phone: unknown; email: unknown };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const hasRequiredClientFields = [body.firstName, body.lastName, body.phone].every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );
    if (!hasRequiredClientFields || !isPlanName(body.planName) || (body.email !== '' && typeof body.email !== 'string')) {
      return NextResponse.json({ error: 'Veuillez renseigner prénom, nom, téléphone et un plan valide.' }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Le paiement Stripe n’est pas encore configuré.' }, { status: 503 });
    }

    const plan = await prisma.plan.findFirst({ where: { name: body.planName } });
    const approvedPlan = getPlanDefinition(body.planName);
    if (!plan || plan.price !== approvedPlan.price || plan.durationDays !== approvedPlan.durationDays) {
      return NextResponse.json({ error: 'Cette formule n’est pas disponible actuellement.' }, { status: 409 });
    }

    const firstName = body.firstName as string;
    const lastName = body.lastName as string;
    const phone = body.phone as string;
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
    const client = await prisma.client.upsert({
      where: { phone: phone.trim() },
      create: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email },
      update: { firstName: firstName.trim(), lastName: lastName.trim(), email },
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email ?? undefined,
      billing_address_collection: 'auto',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(plan.price * 100),
          product_data: { name: `Hag & Ink — ${body.planName}` },
        },
      }],
      metadata: { clientId: client.id, planName: body.planName, planId: plan.id },
      success_url: `${request.nextUrl.origin}/client?payment=success`,
      cancel_url: `${request.nextUrl.origin}/client?payment=cancelled`,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout creation failed:', error);
    return NextResponse.json({ error: 'Impossible de démarrer le paiement sécurisé.' }, { status: 500 });
  }
}
