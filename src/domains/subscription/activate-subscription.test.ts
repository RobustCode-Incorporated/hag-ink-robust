import { describe, expect, it, vi } from 'vitest';
import {
  activateSubscription,
  type MembershipRepository,
} from './activate-subscription';

const standardAdultePlan = {
  id: 'plan-standard-adulte',
  name: 'STANDARD_ADULTE',
  price: 89,
  durationDays: 30,
};

function createRepository(overrides: Partial<MembershipRepository> = {}): MembershipRepository {
  return {
    findClient: vi.fn().mockResolvedValue({
      id: 'client-1234',
      firstName: 'Jean-Luc',
      lastName: 'Luzemban',
    }),
    findPlan: vi.fn().mockResolvedValue(standardAdultePlan),
    activateMembership: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Membership activation use case', () => {
  it('activates a matching plan and persists its ticket in one operation', async () => {
    const repository = createRepository();

    const result = await activateSubscription(
      { clientId: 'client-1234', planName: 'STANDARD_ADULTE' },
      repository,
      new Date('2026-08-15T10:00:00.000Z'),
      () => 'ABCDE',
    );

    expect(result).toMatchObject({
      clientId: 'client-1234',
      planName: 'STANDARD_ADULTE',
      pricePaid: 89,
      donationAmount: 4.45,
      endDate: new Date('2026-09-15T10:00:00.000Z'),
      lotteryTickets: ['LUCK-2026-CLIE-ABCDE'],
    });
    expect(repository.activateMembership).toHaveBeenCalledWith({
      clientId: 'client-1234',
      planId: 'plan-standard-adulte',
      planEndsAt: new Date('2026-09-15T10:00:00.000Z'),
      tickets: [{ ticketNum: 'LUCK-2026-CLIE-ABCDE', drawDate: new Date('2026-09-15T10:00:00.000Z') }],
    });
  });

  it('does not persist when the client does not exist', async () => {
    const repository = createRepository({ findClient: vi.fn().mockResolvedValue(null) });

    await expect(
      activateSubscription({ clientId: 'missing', planName: 'STANDARD_ADULTE' }, repository),
    ).rejects.toThrow('Client introuvable');
    expect(repository.activateMembership).not.toHaveBeenCalled();
  });

  it('does not persist an incorrectly configured catalogue plan', async () => {
    const repository = createRepository({
      findPlan: vi.fn().mockResolvedValue({ ...standardAdultePlan, price: 90 }),
    });

    await expect(
      activateSubscription({ clientId: 'client-1234', planName: 'STANDARD_ADULTE' }, repository),
    ).rejects.toThrow('ne correspond pas');
    expect(repository.activateMembership).not.toHaveBeenCalled();
  });
});
