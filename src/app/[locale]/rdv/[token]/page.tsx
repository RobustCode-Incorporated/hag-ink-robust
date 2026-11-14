import { CalendarPlus, CheckCircle2, MapPin } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SiteNav from '@/components/site/SiteNav';
import { findByToken } from '@/lib/booking';
import { priceLabel } from '@/lib/format';
import { SALON } from '@/config/salon';
import CancelButton from './CancelButton';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function RdvPage({ params, searchParams }: {
  params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ new?: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Rdv');
  const isNew = (await searchParams).new === '1';
  const b = await findByToken(token);
  const loc = `${locale}-BE`;

  const when = b ? new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: SALON.timezone }).format(b.starts_at) : '';

  return (
    <main className="relative min-h-screen bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/salon/fauteuil-plafond-2.jpg" alt="" aria-hidden className="fixed inset-0 h-full w-full object-cover opacity-25" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" aria-hidden />
      <SiteNav solid />
      <div className="relative z-10 mx-auto max-w-xl px-4 pb-24 pt-28">
        {!b ? (
          <p className="text-neutral-300">{t('notFound')}</p>
        ) : (
          <div className="border border-white/10 bg-black/70 p-6 backdrop-blur">
            {b.status === 'BOOKED' && isNew && (
              <p className="mb-6 flex items-center gap-3 font-[family-name:var(--font-display)] text-4xl uppercase tracking-wide text-white neon-text">
                <CheckCircle2 className="h-9 w-9 text-graffiti" /> {t('confirmed', { name: b.first_name })}
              </p>
            )}
            {!isNew && <h1 className="mb-6 font-[family-name:var(--font-display)] text-4xl uppercase tracking-wide text-white">{t('title')}</h1>}
            {b.status === 'CANCELLED' && <p className="mb-4 rounded-sm border border-cabinet/50 bg-cabinet/15 p-3 text-sm text-red-200">{t('cancelled')}</p>}
            {b.status === 'COMPLETED' && <p className="mb-4 text-graffiti">{t('completed')}</p>}
            <dl className="divide-y divide-white/10 text-sm">
              {[[t('when'), when], [t('service'), b.service_name], [t('with'), b.staff_name], [t('price'), priceLabel(b.price_cents, t('priceOnQuote'), loc)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-neutral-400">{k}</dt><dd className="text-right font-semibold capitalize text-white">{v}</dd></div>
              ))}
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">{t('address')}</dt>
                <dd className="text-right"><a href={SALON.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-white hover:text-graffiti"><MapPin className="h-4 w-4" /> {SALON.address.street}</a></dd>
              </div>
            </dl>
            {b.status === 'BOOKED' && (
              <>
                <p className="mt-4 text-xs text-neutral-500">{t('keepLink')}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a href={`/api/bookings/${b.manage_token}/ics`} className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-graffiti px-4 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-white">
                    <CalendarPlus className="h-4 w-4" /> {t('addCalendar')}
                  </a>
                  <CancelButton token={b.manage_token} labels={{ cancel: t('cancel'), confirm: t('cancelConfirm'), tooLate: t('tooLate') }} />
                </div>
              </>
            )}
            <Link href="/reserver" className="mt-6 block text-center text-xs uppercase tracking-wider text-neutral-400 hover:text-white">{t('rebook')}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
