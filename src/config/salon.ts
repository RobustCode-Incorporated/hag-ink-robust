// The ONLY file that describes this tenant. To reuse the Robust Salon System
// for another salon, change this file + public/salon/* + the scroll video
// (see .claude/skills/robust-salon-system/SKILL.md).
//
// Runtime truth for services, team and hours lives in the database (editable
// from /gestion). The seed* lists below only fill a fresh database.

export type DayHours = { opens: string; closes: string } | null;

type Localized = { fr: string; es: string; nl: string; en: string };

export const SALON = {
  name: 'Hag & Ink',
  shortName: 'HAG & INK',
  tagline: {
    fr: 'Barber & tattoo premium à Gombe, Kinshasa',
    es: 'Barbería y tatuaje premium en Gombe, Kinsasa',
    nl: 'Premium barber & tattoo in Gombe, Kinshasa',
    en: 'Premium barber & tattoo in Gombe, Kinshasa',
  } satisfies Localized,
  address: { street: '2 Avenue Colonel Lukusa', postalCode: '', city: 'Kinshasa (Gombe)', country: 'CD', landmark: 'Rond-point Forescom' },
  geo: null as { lat: number; lng: number } | null, // to confirm with the owner (no invented coordinates)
  mapsUrl: 'https://maps.google.com/?q=Hag+%26+Ink+2+Av+Lukusa+Kinshasa',
  phone: '+243841938211' as string | null,
  instagram: 'https://www.instagram.com/hag_ink_barber_243/',
  tiktok: 'https://www.tiktok.com/@hagink2',
  snapchat: 'https://snapchat.com/t/sEt19KQ5',
  planityUrl: null as string | null,
  rating: { value: 4.7, count: 3, source: 'Google' } as { value: number; count: number; source: string } | null, // Google, 2026-11-02
  timezone: 'Africa/Kinshasa',
  locale: 'fr-CD',
  currency: 'USD',
  currencySymbol: '$',
  phoneCountryCode: '243',
  /** Migration in progress (spec 006): keep search engines out until cut-over. */
  noIndex: true,
  /** Booking rules */
  booking: {
    slotStepMin: 15,
    minLeadMin: 30, // can't book less than 30 min ahead
    maxDaysAhead: 30,
    cancelUntilMin: 120, // clients can cancel online until 2 h before
    payment: 'ON_SITE' as const,
  },
  /** Index = weekday (0 = Sunday). Source: Google Business profile, 2026-11-02. Runtime truth = DB (Réglages). */
  openingHours: [
    { opens: '13:00', closes: '19:30' }, // Sun
    { opens: '10:00', closes: '20:30' }, // Mon
    { opens: '10:00', closes: '20:30' }, // Tue
    { opens: '10:00', closes: '20:30' }, // Wed
    { opens: '10:00', closes: '20:30' }, // Thu
    { opens: '10:00', closes: '21:30' }, // Fri
    { opens: '08:30', closes: '21:30' }, // Sat
  ] as DayHours[],
  /**
   * Service menu (owner info 2026-11-02): adult cut 20 $, child cut 15 $. Other prices depend on the
   * request (hair length, locks size): price 0 = "price on site / on quote". Durations are a first
   * estimate, editable in /gestion/prestations. Imported history uses an offline "historique" line.
   */
  seedServices: [
    { slug: 'coupe-adulte', category: 'COUPE', durationMin: 30, priceCents: 2000,
      name: { fr: 'Coupe adulte', es: 'Corte adulto', nl: 'Knippen volwassene', en: 'Adult haircut' } },
    { slug: 'coupe-enfant', category: 'COUPE', durationMin: 30, priceCents: 1500,
      name: { fr: 'Coupe enfant', es: 'Corte niño', nl: 'Knippen kind', en: 'Child haircut' } },
    { slug: 'coiffure-adulte', category: 'COIFFURE', durationMin: 60, priceCents: 0,
      name: { fr: 'Coiffure adulte', es: 'Peinado adulto', nl: 'Kapsel volwassene', en: 'Adult hairstyle' } },
    { slug: 'locks', category: 'LOCKS', durationMin: 120, priceCents: 0, note: 'Prix selon la taille',
      name: { fr: 'Locks (selon la taille)', es: 'Locks (según el tamaño)', nl: 'Locks (volgens grootte)', en: 'Locks (by size)' } },
    { slug: 'tatouage', category: 'TATOUAGE', durationMin: 60, priceCents: 0, online: false,
      name: { fr: 'Tatouage (sur devis)', es: 'Tatuaje (con presupuesto)', nl: 'Tattoo (op offerte)', en: 'Tattoo (on quote)' } },
  ] as Array<{
    slug: string; category: string; durationMin: number; priceCents: number;
    allowedDays?: number[]; note?: string; online?: boolean; name: Localized;
  }>,
  /** Team comes from the old system (import), not from the seed. */
  seedTeam: [] as Array<{ name: string; instagram?: string }>,
  seedProducts: [] as Array<{ name: string; sku: string; priceCents: number; purchaseCents: number; stock: number }>,
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
