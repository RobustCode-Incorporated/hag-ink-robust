import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPlanDefinition, isPlanName } from '@/domains/subscription/subscribe';

type CheckoutBody = {
  planName: unknown;
  firstName: unknown;
  lastName: unknown;
  phone: unknown;
  email: unknown;
  paymentType: unknown;
};

async function parseFlexpayResponse(response: Response, label: string) {
  const rawBody = await response.text();
  try {
    return JSON.parse(rawBody) as { code?: string; message?: string; url?: string; orderNumber?: string };
  } catch {
    console.error(
      `FlexPay ${label} a renvoyé une réponse non-JSON (status ${response.status}):`,
      rawBody.slice(0, 500),
    );
    throw new Error(`Réponse FlexPay ${label} invalide (status ${response.status})`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const hasRequiredClientFields = [body.firstName, body.lastName, body.phone].every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );

    if (!hasRequiredClientFields || !isPlanName(body.planName) || (body.email !== '' && typeof body.email !== 'string')) {
      return NextResponse.json({ error: 'Veuillez renseigner prénom, nom, téléphone et un plan valide.' }, { status: 400 });
    }

    const flexpayToken = process.env.FLEXPAY_TOKEN?.trim();
    const flexpayMerchant = process.env.FLEXPAY_MERCHANT?.trim();
    const flexpayMobileUrl = process.env.FLEXPAY_MOBILE_URL?.trim();
    const flexpayCardUrl = process.env.FLEXPAY_CARD_URL?.trim();

    if (!flexpayToken || !flexpayMerchant || !flexpayMobileUrl || !flexpayCardUrl) {
      return NextResponse.json({ error: 'Le paiement FlexPay n’est pas encore configuré.' }, { status: 503 });
    }

    const plan = await prisma.plan.findFirst({ where: { name: body.planName } });
    const approvedPlan = getPlanDefinition(body.planName);
    if (!plan || plan.price !== approvedPlan.price || plan.durationDays !== approvedPlan.durationDays) {
      return NextResponse.json({ error: 'Cette formule n’est pas disponible actuellement.' }, { status: 409 });
    }

    const firstName = (body.firstName as string).trim();
    const lastName = (body.lastName as string).trim();
    const cleanPhone = (body.phone as string).trim();
    const cleanEmail = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;

    // === GESTION DU CLIENT (Résolution sécurisée des contraintes uniques phone/email) ===
    let client = await prisma.client.findUnique({ where: { phone: cleanPhone } });

    if (client) {
      let safeEmail = client.email;
      if (cleanEmail && cleanEmail !== client.email) {
        const emailOwner = await prisma.client.findUnique({ where: { email: cleanEmail } });
        if (!emailOwner) {
          safeEmail = cleanEmail;
        }
      }

      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName,
          lastName,
          email: safeEmail,
        },
      });
    } else {
      if (cleanEmail) {
        const clientByEmail = await prisma.client.findUnique({ where: { email: cleanEmail } });
        if (clientByEmail) {
          client = await prisma.client.update({
            where: { id: clientByEmail.id },
            data: {
              firstName,
              lastName,
              phone: cleanPhone,
            },
          });
        }
      }

      if (!client) {
        client = await prisma.client.create({
          data: {
            firstName,
            lastName,
            phone: cleanPhone,
            email: cleanEmail,
          },
        });
      }
    }

    const reference = `HAG_${client.id}_${plan.id}_${Date.now()}`;
    const amount = plan.price.toString();
    const currency = 'USD';
    const bearerToken = `Bearer ${flexpayToken}`;

    // Mobile Money (type 1)
    if (body.paymentType === '1') {
      const payload = {
        merchant: flexpayMerchant,
        type: '1',
        phone: cleanPhone,
        reference,
        amount,
        currency,
        callbackUrl: `${request.nextUrl.origin}/api/payments/webhook`,
      };

      const response = await fetch(flexpayMobileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bearerToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await parseFlexpayResponse(response, 'Mobile Money');
      if (data.code !== '0') throw new Error(data.message || 'Erreur FlexPay Mobile Money');
      return NextResponse.json({ message: data.message, orderNumber: data.orderNumber });
    }

    // Carte bancaire (type 2)
    if (body.paymentType === '2') {
      const payload = {
        authorization: bearerToken,
        merchant: flexpayMerchant,
        reference,
        amount,
        currency,
        description: `Hag & Ink - ${plan.name}`,
        callback_url: `${request.nextUrl.origin}/api/payments/webhook`,
        approve_url: `${request.nextUrl.origin}/client?payment=success`,
        cancel_url: `${request.nextUrl.origin}/client?payment=cancelled`,
        decline_url: `${request.nextUrl.origin}/client?payment=failed`,
      };

      const response = await fetch(flexpayCardUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseFlexpayResponse(response, 'Card');
      if (data.code !== '0') throw new Error(data.message || 'Erreur FlexPay Card');
      return NextResponse.json({ url: data.url, orderNumber: data.orderNumber });
    }

    return NextResponse.json({ error: 'Type de paiement invalide.' }, { status: 400 });

  } catch (error) {
    console.error('FlexPay checkout creation failed:', error);
    return NextResponse.json({ error: 'Impossible de démarrer le paiement sécurisé.' }, { status: 500 });
  }
}