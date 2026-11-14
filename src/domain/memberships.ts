// Packs (abonnements) Hag & Ink payés via FlexPay — pure rules. Spec: specs/012-flexpay-packs.md.
// Same prices and durations as the previous Hag & Ink site (PLAN_REGISTRY), so old payments stay comparable.

type Localized = { fr: string; es: string; nl: string; en: string };

export type PlanCode = 'STANDARD_ENFANT' | 'STANDARD_ADULTE' | 'BRAIDS_A' | 'BRAIDS_B' | 'LOCKS_A' | 'LOCKS_B' | 'LIMITED_EDITION';

export type Plan = {
  code: PlanCode;
  name: string;
  priceCents: number;
  valueCents: number;
  months: number;
  tickets: number;
  target: Localized;
  desc: Localized;
};

const five = { fr: 'Jusqu’à 5 prestations', es: 'Hasta 5 servicios', nl: 'Tot 5 behandelingen', en: 'Up to 5 services' };

export const PLANS: readonly Plan[] = [
  { code: 'STANDARD_ENFANT', name: 'Standard Enfant', priceCents: 4900, valueCents: 5000, months: 1, tickets: 1,
    target: { fr: 'Enfants', es: 'Niños', nl: 'Kinderen', en: 'Children' }, desc: five },
  { code: 'STANDARD_ADULTE', name: 'Standard Adulte', priceCents: 8900, valueCents: 10000, months: 1, tickets: 1,
    target: { fr: 'Hommes / Femmes', es: 'Hombres / Mujeres', nl: 'Mannen / Vrouwen', en: 'Men / Women' }, desc: five },
  { code: 'BRAIDS_A', name: 'Braids A', priceCents: 8900, valueCents: 10000, months: 1, tickets: 1,
    target: { fr: 'Tresses classiques', es: 'Trenzas clásicas', nl: 'Klassieke vlechten', en: 'Classic braids' }, desc: five },
  { code: 'BRAIDS_B', name: 'Braids B', priceCents: 18900, valueCents: 20000, months: 1, tickets: 1,
    target: { fr: 'Braids premium', es: 'Trenzas premium', nl: 'Premium vlechten', en: 'Premium braids' }, desc: five },
  { code: 'LOCKS_A', name: 'Locks A', priceCents: 20900, valueCents: 22500, months: 1, tickets: 1,
    target: { fr: 'Entretien locks', es: 'Mantenimiento locks', nl: 'Onderhoud locks', en: 'Locks upkeep' }, desc: five },
  { code: 'LOCKS_B', name: 'Locks B', priceCents: 32900, valueCents: 35000, months: 1, tickets: 1,
    target: { fr: 'Locks premium', es: 'Locks premium', nl: 'Premium locks', en: 'Premium locks' }, desc: five },
  { code: 'LIMITED_EDITION', name: 'Limited Edition', priceCents: 22900, valueCents: 25000, months: 1, tickets: 2,
    target: { fr: 'Artistes, influenceurs, créateurs', es: 'Artistas, influencers, creadores', nl: 'Artiesten, influencers, makers', en: 'Artists, influencers, creators' },
    desc: { fr: 'Coiffures illimitées dans la limite de 5 visites', es: 'Peinados ilimitados hasta 5 visitas', nl: 'Onbeperkt kapsels tot 5 bezoeken', en: 'Unlimited styling, up to 5 visits' } },
];

export function findPlan(code: unknown): Plan | null {
  return PLANS.find((p) => p.code === code) ?? null;
}

/** FlexPay Mobile Money wants the DRC prefix + 9 digits, no "+": "+243 84 193 8211" → "243841938211". */
export function flexpayPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `243${d.slice(1)}`;
  else if (!d.startsWith('243')) d = `243${d}`;
  return /^243\d{9}$/.test(d) ? d : null;
}

/** Membership end: same day N months later (UTC), like the previous site. */
export function membershipEnd(start: Date, months: number): Date {
  const end = new Date(start.getTime());
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

/** Our payment reference sent to FlexPay (well under its 50-char limit). */
export function paymentReference(now: number, rand: () => number): string {
  return `HAG${now.toString(36).toUpperCase()}${Math.floor(rand() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0')}`;
}
