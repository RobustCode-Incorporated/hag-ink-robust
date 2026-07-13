import { describe, it, expect } from 'vitest';
import { createSubscription } from './subscribe';

describe('Domaine Abonnement - Inscription & Loterie', () => {
  it('doit correctement configurer un abonnement mensuel Adulte avec son ticket de loterie et le don RSE', () => {
    // Given
    const client = { id: 'user-1234-5678', firstName: 'Jean-Luc', lastName: 'Luzemban' };
    const startDate = new Date('2026-08-15T10:00:00.000Z');

    // When
    const result = createSubscription(client, 'STANDARD_ADULTE', startDate);

    // Then (Vérification de la nouvelle grille tarifaire)
    expect(result.pricePaid).toBe(89);
    expect(result.planDurationMonths).toBe(1);
    expect(result.donationAmount).toBe(4.45); // 5% de 89$
    expect(result.lotteryTickets.length).toBe(1);
    expect(result.lotteryTickets[0]).toContain('LUCK-2026-USER-');
    
    // Vérification de la robustesse des dates UTC
    expect(result.endDate.toISOString()).toBe('2026-09-15T10:00:00.000Z');
  });

  it('doit correctement configurer un abonnement Limited Edition (Artiste) avec 2 tickets de loterie', () => {
    // Given
    const client = { id: 'artist-9999', firstName: 'Gims', lastName: 'Djuna' };
    const startDate = new Date('2026-08-15T10:00:00.000Z');

    // When
    const result = createSubscription(client, 'LIMITED_EDITION', startDate);

    // Then (Vérification du forfait Artiste Premium)
    expect(result.pricePaid).toBe(229);
    expect(result.planDurationMonths).toBe(1);
    expect(result.donationAmount).toBe(11.45); // 5% de 229$
    expect(result.lotteryTickets.length).toBe(2); // Avantage exclusif : 2 tickets !
    expect(result.lotteryTickets[0]).toContain('LUCK-2026-ARTI-');
    expect(result.lotteryTickets[1]).toContain('LUCK-2026-ARTI-');
    
    expect(result.endDate.toISOString()).toBe('2026-09-15T10:00:00.000Z');
  });
});