'use client';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Scissors, Star } from 'lucide-react';
import Instagram from '@/components/site/InstagramIcon';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Link } from '@/i18n/navigation';
import LogoReveal from '@/components/site/LogoReveal';
import ScrollVideoBackground from '@/components/site/ScrollVideoBackground';
import SiteNav from '@/components/site/SiteNav';
import { SALON, type DayHours } from '@/config/salon';
import { priceLabel } from '@/lib/format';

type Service = { id: string; name: string; category: string; durationMin: number; priceCents: number; allowedDays: number[] | null };
type Barber = { id: string; name: string; instagram: string | null };

const ACCENTS = ['bg-graffiti', 'bg-pink', 'bg-cabinet', 'bg-neon'];
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.7 },
};

export default function HomeClient({ services, barbers, hours }: { services: Service[]; barbers: Barber[]; hours: DayHours[] }) {
  const t = useTranslations('Home');
  const tAmb = useTranslations('Ambassadors');
  const tDays = useTranslations('Days');
  const locale = useLocale();
  const introRef = useRef<HTMLElement>(null);
  const categories = [...new Set(services.map((s) => s.category))];
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const loc = `${locale}-BE`;

  return (
    <main className="relative min-h-screen bg-ink text-neutral-200 selection:bg-graffiti selection:text-black">
      <ScrollVideoBackground introRef={introRef} />
      <SiteNav />

      <div className="relative z-10">
        <section ref={introRef} className="relative w-full">
          <LogoReveal word={SALON.shortName} sub="BARBER SHOP" hint={t('scrollHint')} />

          {/* Hero */}
          <div className="relative flex h-screen w-full items-center justify-center px-4">
            <div className="mx-auto mt-16 flex max-w-4xl flex-col items-center text-center">
              {SALON.rating && (
                <motion.div {...fadeUp} className="mb-8 flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 backdrop-blur-md">
                  <Star className="h-4 w-4 fill-graffiti text-graffiti" />
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-200">
                    {t('rating', { value: SALON.rating.value, count: SALON.rating.count, source: SALON.rating.source })}
                  </span>
                </motion.div>
              )}
              <motion.p {...fadeUp} className="mb-4 text-xs font-bold uppercase tracking-[0.5em] text-graffiti">{t('eyebrow')}</motion.p>
              <motion.h1 {...fadeUp} transition={{ duration: 0.8, delay: 0.15 }}
                className="mb-6 whitespace-pre-line font-[family-name:var(--font-display)] text-5xl uppercase leading-[0.95] tracking-wide text-white neon-text md:text-8xl">
                {t('heroTitle')}
              </motion.h1>
              <motion.p {...fadeUp} transition={{ duration: 0.8, delay: 0.3 }} className="mb-10 max-w-2xl text-lg font-light text-neutral-300 md:text-xl">
                {t('heroText')}
              </motion.p>
              <motion.div {...fadeUp} transition={{ duration: 0.8, delay: 0.45 }} className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
                <Link href="/reserver" className="flex items-center justify-center gap-2 rounded-sm bg-graffiti px-8 py-4 font-bold uppercase tracking-wider text-black transition hover:bg-white">
                  <Calendar className="h-5 w-5" /> {t('ctaBook')}
                </Link>
                <a href="#prestations" className="flex items-center justify-center gap-2 rounded-sm border border-white/25 px-8 py-4 font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/5">
                  <Scissors className="h-5 w-5" /> {t('ctaServices')}
                </a>
              </motion.div>
            </div>
          </div>

          {/* Chapters over the video */}
          {[
            { k: '01', title: t('chapter1Title'), text: t('chapter1Text') },
            { k: '02', title: t('chapter2Title'), text: t('chapter2Text') },
            { k: '03', title: t('chapter3Title'), text: t('chapter3Text'), cta: true },
          ].map((c, i) => (
            <div key={c.k} className={`flex h-screen items-center px-6 ${i % 2 === 0 ? 'justify-start md:pl-[8vw]' : 'justify-end md:pr-[8vw]'}`}>
              <motion.div initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ amount: 0.6 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="max-w-md">
                <span className={`mb-4 inline-block px-2 py-0.5 text-xs font-bold tracking-[0.35em] text-black ${ACCENTS[i]}`}>{c.k}</span>
                <h2 className="mb-5 font-[family-name:var(--font-display)] text-5xl uppercase tracking-wide text-white drop-shadow-2xl md:text-7xl">{c.title}</h2>
                <p className="text-lg font-light text-neutral-200 drop-shadow-lg">{c.text}</p>
                {c.cta && (
                  <Link href="/reserver" className="mt-8 inline-flex items-center gap-2 bg-white px-8 py-4 font-bold uppercase tracking-wider text-black transition hover:bg-graffiti">
                    <Calendar className="h-5 w-5" /> {t('ctaBook')}
                  </Link>
                )}
              </motion.div>
            </div>
          ))}
        </section>

        {/* Services */}
        <section id="prestations" className="scroll-mt-16 px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeUp} className="mb-14 text-center">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-5xl uppercase tracking-wide text-white md:text-6xl">{t('servicesTitle')}</h2>
              <p className="text-neutral-400">{t('servicesText')}</p>
            </motion.div>
            {categories.map((cat) => (
              <div key={cat} className="mb-10">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.4em] text-graffiti">{t(`category_${cat}` as 'category_HOMME')}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {services.filter((s) => s.category === cat).map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                      className="group flex items-center justify-between gap-4 border border-white/10 bg-black/65 p-5 backdrop-blur-sm transition hover:border-graffiti/70">
                      <div>
                        <p className="text-lg font-semibold text-white">{s.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400">
                          <Clock className="h-3.5 w-3.5" /> {t('minutes', { n: s.durationMin })}
                          {s.allowedDays && <> · {s.allowedDays.map((d) => tDays(String(d) as '0').slice(0, 3)).join(', ')}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-[family-name:var(--font-display)] text-3xl text-white">{priceLabel(s.priceCents, t('priceOnQuote'), loc)}</span>
                        <Link href={{ pathname: '/reserver', query: { service: s.id } }}
                          className="rounded-sm border border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition group-hover:border-graffiti group-hover:bg-graffiti group-hover:text-black">
                          {t('book')}
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-center text-sm text-neutral-500">{t('paymentNote')}</p>
          </div>
        </section>

        {/* Team */}
        <section id="barbers" className="scroll-mt-16 bg-black/80 px-4 py-24 backdrop-blur-sm">
          <div className="hex-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-5xl">
            <motion.div {...fadeUp} className="mb-14 text-center">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-5xl uppercase tracking-wide text-white md:text-6xl">{t('teamTitle')}</h2>
              <p className="text-neutral-400">{t('teamText')}</p>
            </motion.div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {barbers.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  className="flex flex-col items-center gap-3 border border-white/10 bg-ink/80 p-6 text-center">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-2xl text-black ${ACCENTS[i % ACCENTS.length]}`}>
                    {b.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-semibold text-white">{b.name}</p>
                  {b.instagram && (
                    <a href={`https://www.instagram.com/${b.instagram}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white">
                      <Instagram className="h-3.5 w-3.5" /> @{b.instagram}
                    </a>
                  )}
                  <Link href={{ pathname: '/reserver', query: { barber: b.id } }} className="text-xs font-bold uppercase tracking-wider text-graffiti hover:text-white">
                    {t('bookWith', { name: b.name })}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Hours & access */}
        <section id="horaires" className="scroll-mt-16 px-4 py-24">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <motion.div {...fadeUp} className="border border-white/10 bg-black/70 p-8 backdrop-blur-sm">
              <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl uppercase tracking-wide text-white">{t('hoursTitle')}</h2>
              <ul className="divide-y divide-white/10">
                {weekOrder.map((d) => (
                  <li key={d} className="flex justify-between py-2.5 text-sm">
                    <span className="text-neutral-300">{tDays(String(d) as '0')}</span>
                    <span className="font-semibold text-white">{hours[d] ? `${hours[d]!.opens} – ${hours[d]!.closes}` : t('closed')}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...fadeUp} className="flex flex-col justify-between border border-white/10 bg-black/70 p-8 backdrop-blur-sm">
              <div>
                <MapPin className="mb-4 h-8 w-8 text-graffiti" />
                <p className="text-2xl font-semibold text-white">{SALON.address.street}</p>
                <p className="text-neutral-400">{SALON.address.postalCode} {SALON.address.city}</p>
                <p className="mt-4 text-sm text-neutral-400">{t('paymentNote')}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={SALON.mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-white/25 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black">
                  {t('directions')}
                </a>
                <a href={SALON.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-sm border border-white/25 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                <Link href="/reserver" className="rounded-sm bg-graffiti px-5 py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-white">{t('ctaBook')}</Link>
              </div>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-black px-4 py-8 text-xs text-neutral-500">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
            <p>© {new Date().getFullYear()} {SALON.name}. {t('footerRights')}</p>
            <Link href="/ambassadeurs" className="uppercase tracking-widest hover:text-white">{tAmb('navLabel')}</Link>
            <a href="https://robust-code.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white">
              {t('poweredBy')}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/RobustCodelogowhite.png" alt="Robust Code" className="h-6 w-6 object-contain" />
              <span className="font-semibold tracking-widest">ROBUST CODE</span>
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
