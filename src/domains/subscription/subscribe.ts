export type PlanName = 
  | 'STANDARD_ENFANT' 
  | 'STANDARD_ADULTE' 
  | 'BRAIDS_A' 
  | 'BRAIDS_B' 
  | 'LOCKS_A' 
  | 'LOCKS_B' 
  | 'LIMITED_EDITION';

const PLAN_REGISTRY: Record<PlanName, { price: number; months: number; ticketsCount: number }> = {
  STANDARD_ENFANT: { price: 49, months: 1, ticketsCount: 1 },
  STANDARD_ADULTE: { price: 89, months: 1, ticketsCount: 1 },
  BRAIDS_A: { price: 89, months: 1, ticketsCount: 1 },
  BRAIDS_B: { price: 189, months: 1, ticketsCount: 1 },
  LOCKS_A: { price: 209, months: 1, ticketsCount: 1 },
  LOCKS_B: { price: 329, months: 1, ticketsCount: 1 },
  LIMITED_EDITION: { price: 229, months: 1, ticketsCount: 2 },
};

interface ClientInput {
  id: string;
  firstName: string;
  lastName: string;
}

interface SubscriptionResult {
  clientId: string;
  planName: PlanName;
  pricePaid: number;
  planDurationMonths: number;
  startDate: Date;
  endDate: Date;
  donationAmount: number;
  lotteryTickets: string[];
}

export function createSubscription(
  client: ClientInput,
  planName: PlanName,
  startDate: Date
): SubscriptionResult {
  const plan = PLAN_REGISTRY[planName];
  if (!plan) {
    throw new Error(`Le plan ${planName} n'existe pas dans le référentiel Hag-Ink.`);
  }

  const endDate = new Date(startDate.getTime());
  endDate.setUTCMonth(endDate.getUTCMonth() + plan.months);

  // Correction Ingénierie Financière : Sécurisation de la précision monétaire (arrondi strict à 2 décimales)
  const donationAmount = Math.round(plan.price * 0.05 * 100) / 100;

  // Génération du nombre requis de tickets de loterie
  const lotteryTickets: string[] = [];
  for (let i = 0; i < plan.ticketsCount; i++) {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Correction Sécurité : On force le segment de l'ID client en majuscules pour homogénéiser les tickets
    const clientSegment = client.id.substring(0, 4).toUpperCase();
    
    lotteryTickets.push(`LUCK-2026-${clientSegment}-${randomSuffix}`);
  }

  return {
    clientId: client.id,
    planName,
    pricePaid: plan.price,
    planDurationMonths: plan.months,
    startDate,
    endDate,
    donationAmount,
    lotteryTickets,
  };
}