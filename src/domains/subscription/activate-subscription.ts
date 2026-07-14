import {
  createSubscription,
  getPlanDefinition,
  type PlanName,
  type SubscriptionResult,
} from './subscribe';

export interface MembershipClient {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

export interface MembershipRepository {
  findClient(clientId: string): Promise<MembershipClient | null>;
  findPlan(planName: PlanName): Promise<MembershipPlan | null>;
  activateMembership(input: {
    clientId: string;
    planId: string;
    planEndsAt: Date;
    tickets: Array<{ ticketNum: string; drawDate: Date }>;
  }): Promise<void>;
}

export class ClientNotFoundError extends Error {
  constructor() {
    super('Client introuvable.');
  }
}

export class PlanConfigurationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface ActivateSubscriptionInput {
  clientId: string;
  planName: PlanName;
}

export async function activateSubscription(
  input: ActivateSubscriptionInput,
  repository: MembershipRepository,
  now: Date = new Date(),
  createTicketSuffix?: () => string,
): Promise<SubscriptionResult> {
  const [client, plan] = await Promise.all([
    repository.findClient(input.clientId),
    repository.findPlan(input.planName),
  ]);

  if (!client) {
    throw new ClientNotFoundError();
  }

  if (!plan) {
    throw new PlanConfigurationError(`Le plan ${input.planName} est introuvable dans le catalogue.`);
  }

  const expectedPlan = getPlanDefinition(input.planName);
  if (plan.price !== expectedPlan.price || plan.durationDays !== expectedPlan.durationDays) {
    throw new PlanConfigurationError(
      `La configuration du plan ${input.planName} ne correspond pas au catalogue Hag-Ink approuvé.`,
    );
  }

  const subscription = createSubscription(client, input.planName, now, createTicketSuffix);
  await repository.activateMembership({
    clientId: client.id,
    planId: plan.id,
    planEndsAt: subscription.endDate,
    tickets: subscription.lotteryTickets.map((ticketNum) => ({
      ticketNum,
      drawDate: subscription.endDate,
    })),
  });

  return subscription;
}
