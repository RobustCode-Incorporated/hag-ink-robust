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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const hasRequiredClientFields = [body.firstName, body.lastName, body.phone].every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );
    
    if (!hasRequiredClientFields || !isPlanName(body.planName) || (body.email !== '' && typeof body.email !== 'string')) {
      return NextResponse.json({ error: 'Veuillez renseigner prénom, nom, téléphone et un plan valide.' }, { status: 400 });
    }
    
    if (!process.env.FLEXPAY_TOKEN || !process.env.FLEXPAY_MERCHANT) {
      return NextResponse.json({ error: 'Le paiement FlexPay n’est pas encore configuré.' }, { status: 503 });
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

    // Astuce : on encode les ID dans la référence pour que le webhook puisse les identifier
    const reference = `HAG_${client.id}_${plan.id}_${Date.now()}`;
    const amount = plan.price.toString();
    const currency = "USD"; // Devise paramétrée en dollars

    // === GESTION MOBILE MONEY (Type 1) ===
    if (body.paymentType === '1') {
      const payload = {
        merchant: process.env.FLEXPAY_MERCHANT,
        type: "1",
        phone: phone.trim(),
        reference: reference,
        amount: amount,
        currency: currency,
        callbackUrl: `${request.nextUrl.origin}/api/payments/webhook`,
      };

      const response = await fetch(process.env.FLEXPAY_MOBILE_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FLEXPAY_TOKEN}` // Token dans le Header[cite: 1]
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.code !== "0") throw new Error(data.message || 'Erreur FlexPay Mobile Money');
      
      // FlexPay renvoie un message demandant de valider le push[cite: 1]
      return NextResponse.json({ message: data.message, orderNumber: data.orderNumber });
    } 
    
    // === GESTION CARTE BANCAIRE (Type 2) ===
    else if (body.paymentType === '2') {
      const payload = {
        authorization: `Bearer ${process.env.FLEXPAY_TOKEN}`, // Token dans le Body JSON pour Card V2[cite: 2]
        merchant: process.env.FLEXPAY_MERCHANT,
        reference: reference,
        amount: amount,
        currency: currency,
        description: `Hag & Ink - ${plan.name}`,
        callback_url: `${request.nextUrl.origin}/api/payments/webhook`, // Format snake_case pour les URL de retour cartes[cite: 2]
        approve_url: `${request.nextUrl.origin}/client?payment=success`,
        cancel_url: `${request.nextUrl.origin}/client?payment=cancelled`,
        decline_url: `${request.nextUrl.origin}/client?payment=failed`
      };

      const response = await fetch(process.env.FLEXPAY_CARD_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.code !== "0") throw new Error(data.message || 'Erreur FlexPay Card');
      
      // FlexPay renvoie une URL pour la redirection[cite: 2]
      return NextResponse.json({ url: data.url, orderNumber: data.orderNumber });
    } 
    
    else {
      return NextResponse.json({ error: 'Type de paiement invalide.' }, { status: 400 });
    }

  } catch (error) {
    console.error('FlexPay checkout creation failed:', error);
    return NextResponse.json({ error: 'Impossible de démarrer le paiement sécurisé.' }, { status: 500 });
  }
}