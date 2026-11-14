// Ambassador program rules (pure). Spec: specs/010-programme-ambassadeurs-ugc.md.
// Adapted from Debs Hair & Beauty: same attribution policy, discount applied at the till.

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "Amina Mbuyi" -> "amina-mbuyi" (then -2, -3 if taken). */
export function makeSlug(name: string, taken: Set<string>): string {
  const base = strip(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'createur';
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** "Amina", 10 -> "AMINA10" (then AMINA10B, AMINA10C… if taken). */
export function makePromoCode(firstName: string, percent: number, taken: Set<string>): string {
  const base = `${strip(firstName).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'HAGINK'}${percent}`;
  if (!taken.has(base)) return base;
  for (const c of 'BCDEFGHJKLMNPQRSTUVWXYZ') if (!taken.has(base + c)) return base + c;
  throw new Error('No free promo code');
}

export function normalizeCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const c = code.trim().toUpperCase();
  return /^[A-Z0-9]{3,20}$/.test(c) ? c : null;
}

export type PromoRow = {
  id: string; ambassadorId: string; percent: number; maxUses: number | null; uses: number;
  perClientLimit: number; validUntil: string | null; active: boolean; ambassadorActive: boolean;
};
export type PromoRefusal = 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'CLIENT_LIMIT';

/** Server-side check. today/validUntil are salon dates "YYYY-MM-DD". */
export function checkPromo(p: PromoRow, ctx: { today: string; clientUses: number }): { ok: true } | { ok: false; reason: PromoRefusal } {
  if (!p.active || !p.ambassadorActive) return { ok: false, reason: 'INACTIVE' };
  if (p.validUntil && ctx.today > p.validUntil) return { ok: false, reason: 'EXPIRED' };
  if (p.maxUses !== null && p.uses >= p.maxUses) return { ok: false, reason: 'EXHAUSTED' };
  if (ctx.clientUses >= p.perClientLimit) return { ok: false, reason: 'CLIENT_LIMIT' };
  return { ok: true };
}

/** Discount on the price charged at the till, rounded to the cent, never more than the amount. */
export function discountCents(amountCents: number, percent: number): number {
  if (amountCents <= 0) return 0;
  return Math.min(amountCents, Math.round((amountCents * percent) / 100));
}

/**
 * Debs policy: link + code of the same creator -> LINK_AND_CODE; link of A + code of B -> credited to the
 * link (most recent reference), code kept, conflict flagged for review; code only -> CODE.
 */
export function resolveAttribution(linkAmbassadorId: string | null, code: { id: string; ambassadorId: string } | null):
  { ambassadorId: string; promoCodeId: string | null; via: 'LINK' | 'CODE' | 'LINK_AND_CODE'; hasConflict: boolean } | null {
  if (linkAmbassadorId && code) {
    return { ambassadorId: linkAmbassadorId, promoCodeId: code.id, via: 'LINK_AND_CODE', hasConflict: code.ambassadorId !== linkAmbassadorId };
  }
  if (linkAmbassadorId) return { ambassadorId: linkAmbassadorId, promoCodeId: null, via: 'LINK', hasConflict: false };
  if (code) return { ambassadorId: code.ambassadorId, promoCodeId: code.id, via: 'CODE', hasConflict: false };
  return null;
}

/** Link previews and crawlers are not visits. */
export function isBot(userAgent: string | null): boolean {
  return !userAgent || /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|python|headless/i.test(userAgent);
}
