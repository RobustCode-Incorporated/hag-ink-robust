export interface ServiceRepository {
  barberExists(barberId: string): Promise<boolean>;
  save(input: { barberId: string; amount: number }): Promise<{ id: string; amount: number; createdAt: Date }>;
}

export async function createService(
  input: { barberId: string; amount: number },
  repository: ServiceRepository,
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Service amount must be a positive number.');
  }
  if (!(await repository.barberExists(input.barberId))) {
    throw new Error('Barber not found.');
  }
  return repository.save(input);
}
