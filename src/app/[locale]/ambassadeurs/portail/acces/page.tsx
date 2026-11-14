import { setRequestLocale } from 'next-intl/server';
import SiteNav from '@/components/site/SiteNav';
import Access from './Access';

export const metadata = { robots: { index: false } };

export default async function PortalAccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="relative min-h-screen bg-ink">
      <SiteNav solid />
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 text-center"><Access /></div>
    </main>
  );
}
