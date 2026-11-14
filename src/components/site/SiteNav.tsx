'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { SALON } from '@/config/salon';

export default function SiteNav({ solid = false }: { solid?: boolean }) {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(solid);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 2.2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className={`font-[family-name:var(--font-display)] text-xl tracking-wider text-white neon-text transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {SALON.shortName}
        </Link>
        <div className="flex items-center gap-1 sm:gap-5 text-xs uppercase tracking-[0.2em] text-neutral-300">
          <Link href="/#prestations" className="hidden sm:inline hover:text-white">{t('services')}</Link>
          <Link href="/#barbers" className="hidden sm:inline hover:text-white">{t('team')}</Link>
          <Link href="/#horaires" className="hidden md:inline hover:text-white">{t('hours')}</Link>
          <label className="sr-only" htmlFor="lang">{t('language')}</label>
          <div id="lang" className="flex items-center rounded-full border border-white/15 bg-black/40 p-0.5">
            {routing.locales.map((l) => (
              <Link key={l} href={pathname} locale={l}
                className={`rounded-full px-2 py-1 text-[10px] ${l === locale ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}>
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
          <Link href="/reserver" className="rounded-full bg-graffiti px-4 py-2 font-bold text-black hover:bg-white">
            {t('book')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
