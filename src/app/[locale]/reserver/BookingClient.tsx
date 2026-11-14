'use client';
import { ArrowLeft, Check, Clock, Loader2, User, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import SiteNav from '@/components/site/SiteNav';
import { priceLabel } from '@/lib/format';

type Service = { id: string; name: string; durationMin: number; priceCents: number; allowedDays: number[] | null };
type Barber = { id: string; name: string };

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

function StepHead({ n, step, label, value, onEdit, changeLabel }: {
  n: number; step: number; label: string; value?: string | null; onEdit?: () => void; changeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step > n ? 'bg-graffiti text-black' : step === n ? 'bg-white text-black' : 'border border-white/20 text-neutral-500'}`}>
          {step > n ? <Check className="h-4 w-4" /> : n}
        </span>
        <div>
          <p className={`text-xs uppercase tracking-[0.25em] ${step >= n ? 'text-neutral-300' : 'text-neutral-600'}`}>{label}</p>
          {value && step > n && <p className="font-semibold text-white">{value}</p>}
        </div>
      </div>
      {onEdit && step > n && <button type="button" onClick={onEdit} className="text-xs uppercase tracking-wider text-graffiti hover:text-white">{changeLabel}</button>}
    </div>
  );
}

export default function BookingClient(props: {
  services: Service[]; barbers: Barber[]; openDays: boolean[]; today: string; maxDays: number;
  initialService: string | null; initialBarber: string | null;
  /** Ambassador link (spec 010): /reserver?ref=<slug> */
  referral?: { slug: string; name: string } | null;
}) {
  const t = useTranslations('Booking');
  const locale = useLocale();
  const router = useRouter();
  const loc = `${locale}-BE`;

  const [serviceId, setServiceId] = useState<string | null>(props.initialService);
  const [staffId, setStaffId] = useState<string | null>(props.initialBarber);
  const [pickedDate, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotResult, setSlotResult] = useState<{ key: string; slots: string[] } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '', promoCode: '', consent: false, website: '' });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const service = props.services.find((s) => s.id === serviceId) ?? null;
  const barberName = staffId === 'any' ? t('any') : props.barbers.find((b) => b.id === staffId)?.name;

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= props.maxDays; i++) {
      const d = addDays(props.today, i);
      if (!props.openDays[weekday(d)]) continue;
      if (service?.allowedDays && !service.allowedDays.includes(weekday(d))) continue;
      out.push(d);
    }
    return out;
  }, [props.today, props.maxDays, props.openDays, service]);

  // The selected day falls back to the first open day (derived, no effect needed).
  const date = pickedDate && days.includes(pickedDate) ? pickedDate : days[0] ?? null;
  const slotKey = serviceId && staffId && date ? `${date}|${serviceId}|${staffId}|${refresh}` : null;
  const slots = slotResult && slotResult.key === slotKey ? slotResult.slots : null;
  const loadingSlots = slotKey !== null && slots === null;

  useEffect(() => {
    if (!slotKey) return;
    let cancelled = false;
    const [d, sv, st] = slotKey.split('|');
    fetch(`/api/availability?date=${d}&serviceId=${sv}&staffId=${st}`)
      .then((r) => r.json())
      .then((res: { slots?: string[] }) => { if (!cancelled) setSlotResult({ key: slotKey, slots: res.slots ?? [] }); })
      .catch(() => { if (!cancelled) setSlotResult({ key: slotKey, slots: [] }); });
    return () => { cancelled = true; };
  }, [slotKey]);

  const step = !service ? 1 : !staffId ? 2 : !time ? 3 : 4;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.consent) { setError(t('errors.CONSENT')); return; }
    setSending(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, staffId, date, time, ...form, ref: props.referral?.slug ?? '', locale }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        const code = data.error ?? 'generic';
        setError(t.has(`errors.${code}`) ? t(`errors.${code}` as 'errors.generic') : t('errors.generic'));
        if (code === 'SLOT_TAKEN') { setTime(null); setRefresh((n) => n + 1); }
        return;
      }
      router.push(`/rdv/${data.token}?new=1`);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSending(false);
    }
  };

  const fmtDay = (d: string) => new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
  const fmtNum = (d: string) => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
  const fmtLong = (d: string) => new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));

  const inputCls = 'w-full rounded-sm border border-white/15 bg-black/60 px-4 py-3 text-white outline-none placeholder:text-neutral-500 focus:border-graffiti';

  return (
    <main className="relative min-h-screen bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/salon/fauteuil-plafond.jpg" alt="" aria-hidden className="fixed inset-0 h-full w-full object-cover opacity-25" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" aria-hidden />
      <SiteNav solid />
      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-24">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>
        <h1 className="mb-8 font-[family-name:var(--font-display)] text-5xl uppercase tracking-wide text-white neon-text">{t('title')}</h1>

        <div className="space-y-4">
          {/* 1. Service */}
          <section className="border border-white/10 bg-black/60 p-5 backdrop-blur">
            <StepHead step={step} changeLabel={t('change')} n={1} label={t('stepService')} value={service ? `${service.name} · ${priceLabel(service.priceCents, t('priceOnQuote'), loc)}` : null}
              onEdit={() => { setServiceId(null); setTime(null); }} />
            {step === 1 && (
              <div className="mt-4 grid gap-2">
                {props.services.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setServiceId(s.id); setTime(null); }}
                    className="flex items-center justify-between rounded-sm border border-white/10 px-4 py-3 text-left transition hover:border-graffiti hover:bg-white/5">
                    <span>
                      <span className="block font-semibold text-white">{s.name}</span>
                      <span className="flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3 w-3" /> {s.durationMin} min</span>
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl text-white">{priceLabel(s.priceCents, t('priceOnQuote'), loc)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 2. Barber */}
          <section className="border border-white/10 bg-black/60 p-5 backdrop-blur">
            <StepHead step={step} changeLabel={t('change')} n={2} label={t('stepBarber')} value={barberName} onEdit={() => { setStaffId(null); setTime(null); }} />
            {step === 2 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => setStaffId('any')}
                  className="col-span-2 flex items-center gap-3 rounded-sm border border-graffiti/60 bg-graffiti/10 px-4 py-3 text-left hover:bg-graffiti/20 sm:col-span-3">
                  <Users className="h-5 w-5 text-graffiti" />
                  <span><span className="block font-semibold text-white">{t('any')}</span><span className="text-xs text-neutral-400">{t('anyHint')}</span></span>
                </button>
                {props.barbers.map((b) => (
                  <button key={b.id} type="button" onClick={() => setStaffId(b.id)}
                    className="flex items-center gap-2 rounded-sm border border-white/10 px-3 py-3 text-left text-sm font-semibold text-white hover:border-graffiti hover:bg-white/5">
                    <User className="h-4 w-4 text-neutral-400" /> {b.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 3. Date & time */}
          <section className="border border-white/10 bg-black/60 p-5 backdrop-blur">
            <StepHead step={step} changeLabel={t('change')} n={3} label={t('stepTime')} value={date && time ? `${fmtLong(date)} · ${time}` : null} onEdit={() => setTime(null)} />
            {step === 3 && (
              <div className="mt-4">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
                  {days.map((d) => (
                    <button key={d} type="button" onClick={() => { setDate(d); setTime(null); }}
                      className={`flex min-w-[64px] flex-col items-center rounded-sm border px-3 py-2 text-xs uppercase ${d === date ? 'border-graffiti bg-graffiti text-black' : 'border-white/10 text-neutral-300 hover:border-white/40'}`}>
                      <span className="font-bold">{fmtDay(d)}</span>
                      <span>{fmtNum(d)}</span>
                    </button>
                  ))}
                </div>
                {loadingSlots && <p className="flex items-center gap-2 py-4 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}</p>}
                {slots && slots.length === 0 && <p className="py-4 text-sm text-neutral-400">{t('noSlots')}</p>}
                {slots && slots.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {slots.map((s) => (
                      <button key={s} type="button" onClick={() => setTime(s)}
                        className="rounded-sm border border-white/15 py-2 text-sm font-semibold text-white hover:border-graffiti hover:bg-graffiti hover:text-black">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Details */}
          <section className="border border-white/10 bg-black/60 p-5 backdrop-blur">
            <StepHead step={step} changeLabel={t('change')} n={4} label={t('stepDetails')} />
            {step === 4 && service && date && time && (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required autoComplete="given-name" placeholder={`${t('firstName')} *`} className={inputCls} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  <input autoComplete="family-name" placeholder={t('lastName')} className={inputCls} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <input required type="tel" autoComplete="tel" placeholder={`${t('phone')} *`} className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input type="email" autoComplete="email" placeholder={t('email')} className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {props.referral && <p className="text-sm text-neutral-300">{t('referredBy', { name: props.referral.name })}</p>}
                <input autoComplete="off" maxLength={20} placeholder={t('promoCode')} className={`${inputCls} uppercase`} value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value })} />
                <textarea rows={2} maxLength={500} placeholder={t('notes')} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <label className="flex items-start gap-3 text-sm text-neutral-300">
                  <input type="checkbox" className="mt-1 accent-[#ffb21e]" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                  {t('consent')}
                </label>
                <div className="rounded-sm border border-white/10 bg-white/5 p-4 text-sm">
                  <p className="mb-1 text-xs uppercase tracking-[0.25em] text-neutral-400">{t('summary')}</p>
                  <p className="text-white">{service.name} · {barberName}</p>
                  <p className="text-white">{fmtLong(date)} · {time}</p>
                  <p className="mt-1 font-semibold text-graffiti">{priceLabel(service.priceCents, t('priceOnQuote'), loc)} — {t('payOnSite')}</p>
                </div>
                {error && <p role="alert" className="rounded-sm border border-cabinet/50 bg-cabinet/15 p-3 text-sm text-red-200">{error}</p>}
                <button type="submit" disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-graffiti py-4 font-bold uppercase tracking-wider text-black transition hover:bg-white disabled:opacity-60">
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />} {sending ? t('sending') : t('confirm')}
                </button>
              </form>
            )}
            {error && step !== 4 && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
