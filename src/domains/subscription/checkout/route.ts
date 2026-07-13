import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSubscription, PlanName } from '@/domains/subscription/subscribe';

/**
 * Route API de Checkout : Reçoit la demande, interroge Neon via Prisma, 
 * exécute la logique du Domaine, persiste la transaction et répond au Client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, planName } = body;

    // 1. Contrôle défensif des inputs
    if (!clientId || !planName) {
      return NextResponse.json(
        { success: false, error: "Paramètres 'clientId' et 'planName' obligatoires." },
        { status: 400 }
      );
    }

    // 2. Recherche de l'utilisateur dans Neon Postgres
    const client = await prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Le client spécifié n'existe pas chez Hag-Ink." },
        { status: 404 }
      );
    }

    // 3. Appel du Domaine Métier (le fichier subscribe.ts que tu as gardé !)
    const now = new Date();
    const domainResult = createSubscription(
      {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
      },
      planName as PlanName,
      now
    );

    // 4. Préparation pour Prisma 7 (on transforme le tableau de tickets en string séparée par des virgules)
    const lotteryTicketsString = domainResult.lotteryTickets.join(', ');

    // 5. Enregistrement sécurisé en Base de Données
    const savedSubscription = await prisma.subscription.create({
      data: {
        clientId: domainResult.clientId,
        planName: domainResult.planName,
        pricePaid: domainResult.pricePaid,
        planDurationMonths: domainResult.planDurationMonths,
        donationAmount: domainResult.donationAmount,
        lotteryTickets: lotteryTicketsString,
        startDate: domainResult.startDate,
        endDate: domainResult.endDate,
        status: "ACTIVE",
      },
    });

    // 6. Envoi de la réponse structurée au Frontend UI
    return NextResponse.json({
      success: true,
      message: "Abonnement activé avec succès. Merci pour votre soutien !",
      data: {
        id: savedSubscription.id,
        plan: savedSubscription.planName,
        pricePaid: savedSubscription.pricePaid,
        expiration: savedSubscription.endDate,
        lotteryTickets: domainResult.lotteryTickets, // Renvoie le tableau propre au format JSON
        donationRse: savedSubscription.donationAmount,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}