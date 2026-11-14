import { describe, expect, it } from 'vitest';
import { checkPromo, discountCents, isBot, makePromoCode, makeSlug, normalizeCode, resolveAttribution, type PromoRow } from '@/domain/ambassadors';

const promo = (o: Partial<PromoRow> = {}): PromoRow => ({ id: 'p', ambassadorId: 'A', percent: 10, maxUses: null, uses: 0, perClientLimit: 1, validUntil: null, active: true, ambassadorActive: true, ...o });

describe('ambassador program', () => {
  it('builds unique slugs and codes', () => {
    expect(makeSlug('Amina Mbuyi-Kalala', new Set())).toBe('amina-mbuyi-kalala');
    expect(makeSlug('Élodie', new Set(['elodie']))).toBe('elodie-2');
    expect(makePromoCode('Amina', 10, new Set())).toBe('AMINA10');
    expect(makePromoCode('Amina', 10, new Set(['AMINA10']))).toBe('AMINA10B');
    expect(normalizeCode(' amina10 ')).toBe('AMINA10');
    expect(normalizeCode('a')).toBeNull();
  });

  it('checks codes server side', () => {
    expect(checkPromo(promo(), { today: '2026-11-02', clientUses: 0 })).toEqual({ ok: true });
    expect(checkPromo(promo({ active: false }), { today: '2026-11-02', clientUses: 0 })).toMatchObject({ reason: 'INACTIVE' });
    expect(checkPromo(promo({ ambassadorActive: false }), { today: '2026-11-02', clientUses: 0 })).toMatchObject({ reason: 'INACTIVE' });
    expect(checkPromo(promo({ validUntil: '2026-11-01' }), { today: '2026-11-02', clientUses: 0 })).toMatchObject({ reason: 'EXPIRED' });
    expect(checkPromo(promo({ maxUses: 5, uses: 5 }), { today: '2026-11-02', clientUses: 0 })).toMatchObject({ reason: 'EXHAUSTED' });
    expect(checkPromo(promo(), { today: '2026-11-02', clientUses: 1 })).toMatchObject({ reason: 'CLIENT_LIMIT' });
  });

  it('computes the discount on the amount charged', () => {
    expect(discountCents(2000, 10)).toBe(200);
    expect(discountCents(1500, 15)).toBe(225);
    expect(discountCents(0, 10)).toBe(0);
    expect(discountCents(333, 50)).toBe(167);
  });

  it('applies the Debs attribution policy', () => {
    expect(resolveAttribution('A', { id: 'c', ambassadorId: 'A' })).toEqual({ ambassadorId: 'A', promoCodeId: 'c', via: 'LINK_AND_CODE', hasConflict: false });
    expect(resolveAttribution('A', { id: 'c', ambassadorId: 'B' })).toEqual({ ambassadorId: 'A', promoCodeId: 'c', via: 'LINK_AND_CODE', hasConflict: true });
    expect(resolveAttribution(null, { id: 'c', ambassadorId: 'B' })).toMatchObject({ ambassadorId: 'B', via: 'CODE' });
    expect(resolveAttribution('A', null)).toMatchObject({ via: 'LINK', promoCodeId: null });
    expect(resolveAttribution(null, null)).toBeNull();
  });

  it('does not count link previews', () => {
    expect(isBot('WhatsApp/2.23')).toBe(true);
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false);
  });
});
