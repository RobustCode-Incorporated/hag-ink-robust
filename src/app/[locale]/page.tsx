import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { listBookableBarbers, listServices, type Locale } from '@/lib/booking';
import { getOpeningHours } from '@/lib/hours';
import { SALON, SITE_URL } from '@/config/salon';
import HomeClient from './HomeClient';

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [services, barbers, hours] = await Promise.all([
    listServices(locale as Locale, { onlineOnly: true }),
    listBookableBarbers(),
    getOpeningHours(),
  ]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: SALON.name,
    url: SITE_URL,
    image: `${SITE_URL}/salon/fauteuil-plafond.jpg`,
    priceRange: SALON.currencySymbol,
    address: { '@type': 'PostalAddress', streetAddress: SALON.address.street, postalCode: SALON.address.postalCode, addressLocality: SALON.address.city, addressCountry: SALON.address.country },
    ...(SALON.geo ? { geo: { '@type': 'GeoCoordinates', latitude: SALON.geo.lat, longitude: SALON.geo.lng } } : {}),
    sameAs: [SALON.instagram, SALON.planityUrl].filter(Boolean),
    ...(SALON.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: SALON.rating.value, reviewCount: SALON.rating.count } } : {}),
    openingHoursSpecification: hours.flatMap((h, i) => (h ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: days[i], opens: h.opens, closes: h.closes }] : [])),
    makesOffer: services.map((s) => ({ '@type': 'Offer', name: s.name, ...(s.price_cents > 0 ? { price: (s.price_cents / 100).toFixed(2), priceCurrency: SALON.currency } : {}) })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category, durationMin: s.duration_min, priceCents: s.price_cents, allowedDays: s.allowed_days }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.display_name, instagram: b.instagram }))}
        hours={hours}
      />
    </>
  );
}
