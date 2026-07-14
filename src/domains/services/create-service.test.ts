import { describe, expect, it, vi } from 'vitest';
import { createService, type ServiceRepository } from './create-service';

const repository = (barberExists = true): ServiceRepository => ({
  barberExists: vi.fn().mockResolvedValue(barberExists),
  save: vi.fn().mockResolvedValue({ id: 'service-1', amount: 45, createdAt: new Date('2026-07-14T10:00:00Z') }),
});

describe('create service', () => {
  it('saves a positive service for an existing barber', async () => {
    const services = repository();
    await expect(createService({ barberId: 'barber-1', amount: 45 }, services)).resolves.toMatchObject({ amount: 45 });
    expect(services.save).toHaveBeenCalledWith({ barberId: 'barber-1', amount: 45 });
  });

  it('rejects invalid amounts before persistence', async () => {
    const services = repository();
    await expect(createService({ barberId: 'barber-1', amount: 0 }, services)).rejects.toThrow('positive');
    expect(services.save).not.toHaveBeenCalled();
  });

  it('rejects an unknown barber before persistence', async () => {
    const services = repository(false);
    await expect(createService({ barberId: 'missing', amount: 45 }, services)).rejects.toThrow('not found');
    expect(services.save).not.toHaveBeenCalled();
  });
});
