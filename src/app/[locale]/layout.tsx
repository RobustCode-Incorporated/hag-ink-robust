import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Anton, Archivo } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SALON, SITE_URL } from '@/config/salon';
import '../globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' });
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: '#050505' };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: `%s — ${t('title')}` },
    description: t('description'),
    alternates: {
      canonical: locale === 'fr' ? '/' : `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, l === 'fr' ? '/' : `/${l}`])),
    },
    openGraph: { siteName: SALON.name, locale, type: 'website', images: ['/salon/fauteuil-plafond.jpg'] },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${anton.variable} ${archivo.variable}`}>
      <body className="min-h-screen bg-ink font-[family-name:var(--font-body)] text-neutral-200">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
