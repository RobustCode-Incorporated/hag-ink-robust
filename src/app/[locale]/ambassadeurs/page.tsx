import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SiteNav from '@/components/site/SiteNav';
import { routing } from '@/i18n/routing';
import ApplyForm from './ApplyForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Ambassadors' });
  return { title: t('title') };
}

// Public UGC / ambassador application (spec 010, phase 1).
export default async function AmbassadorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('Ambassadors');
  return (
    <main className="relative min-h-screen bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/salon/anneau-lumineux.jpg" alt="" aria-hidden className="fixed inset-0 h-full w-full object-cover opacity-25" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" aria-hidden />
      <SiteNav solid />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-32 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-graffiti">{t('eyebrow')}</p>
          <h1 className="mb-6 font-[family-name:var(--font-display)] text-5xl uppercase leading-[0.95] text-white neon-text md:text-7xl">{t('title')}</h1>
          <p className="mb-8 text-lg text-neutral-300">{t('intro')}</p>
          <ol className="space-y-3 text-neutral-200">
            {(['how1', 'how2', 'how3'] as const).map((k, i) => (
              <li key={k} className="flex gap-4"><span className="font-[family-name:var(--font-display)] text-2xl text-graffiti">0{i + 1}</span><span className="pt-1">{t(k)}</span></li>
            ))}
          </ol>
        </div>
        <ApplyForm />
      </div>
    </main>
  );
}
