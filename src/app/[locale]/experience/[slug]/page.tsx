import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SiteNav from '@/components/site/SiteNav';
import { findAmbassador, recordVisit } from '@/lib/ambassadors';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

// Personal link of an ambassador (spec 010): counts the visit, then sends to booking with ?ref=<slug>.
export default async function ExperiencePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const amb = await findAmbassador(slug);
  if (!amb) notFound();
  await recordVisit(amb.id, (await headers()).get('user-agent'));
  const t = await getTranslations('Ambassadors');

  return (
    <main className="relative min-h-screen bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/salon/equipe-salon-1.jpg" alt="" aria-hidden className="fixed inset-0 h-full w-full object-cover opacity-30" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" aria-hidden />
      <SiteNav solid />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-graffiti">{t('eyebrow')}</p>
        <h1 className="mb-6 font-[family-name:var(--font-display)] text-5xl uppercase leading-[0.95] text-white neon-text md:text-7xl">{t('expTitle', { name: amb.display_name })}</h1>
        <p className="mb-4 text-lg text-neutral-300">{t('expText', { name: amb.display_name })}</p>
        {amb.code && amb.percent && <p className="mb-8 text-base text-white">{t('expCode', { code: amb.code, percent: amb.percent })}</p>}
        <Link href={{ pathname: '/reserver', query: { ref: amb.slug } }} className="bg-graffiti px-8 py-4 font-bold uppercase tracking-wider text-black hover:opacity-90">
          {t('expCta')}
        </Link>
      </div>
    </main>
  );
}
