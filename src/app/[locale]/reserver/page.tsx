import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { listBookableBarbers, listServices, type Locale } from '@/lib/booking';
import { getOpeningHours } from '@/lib/hours';
import { SALON } from '@/config/salon';
import { salonDate } from '@/lib/timezone';
import BookingClient from './BookingClient';
import { findAmbassador } from '@/lib/ambassadors';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Booking' });
  return { title: t('title') };
}

export default async function BookingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ service?: string; barber?: string; ref?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const [services, barbers, hours, ambassador] = await Promise.all([
    listServices(locale as Locale, { onlineOnly: true }), listBookableBarbers(), getOpeningHours(),
    sp.ref ? findAmbassador(sp.ref) : Promise.resolve(null),
  ]);
  return (
    <BookingClient
      services={services.map((s) => ({ id: s.id, name: s.name, durationMin: s.duration_min, priceCents: s.price_cents, allowedDays: s.allowed_days }))}
      barbers={barbers.map((b) => ({ id: b.id, name: b.display_name }))}
      openDays={hours.map((h) => h !== null)}
      today={salonDate(new Date())}
      maxDays={SALON.booking.maxDaysAhead}
      initialService={services.some((s) => s.id === sp.service) ? sp.service! : null}
      initialBarber={barbers.some((b) => b.id === sp.barber) ? sp.barber! : null}
      referral={ambassador ? { slug: ambassador.slug, name: ambassador.display_name } : null}
    />
  );
}
