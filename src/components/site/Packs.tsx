'use client';
// "Packs" section + FlexPay checkout (spec 012). Rendered only when SALON.features.memberships is true.
import { Check, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { PLANS, type Plan } from '@/domain/memberships';
import { euros } from '@/lib/format';

type Loc = 'fr' | 'es' | 'nl' | 'en';

const noSubscribe = () => () => {};
function readPaymentReturn() {
  const p = new URLSearchParams(window.location.search).get('payment');
  return p === 'success' || p === 'cancelled' || p === 'failed' ? p : null;
}

export default function Packs() {
  const t = useTranslations('Packs');
  const locale = useLocale() as Loc;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', method: 'MOBILE_MONEY' });
  const [state, setState] = useState<{ busy: boolean; error?: string; ok?: string }>({ busy: false });
  // Back from the FlexPay card page: ?payment=success|cancelled|failed (read on the client only).
  const returned = useSyncExternalStore(noSubscribe, readPaymentReturn, () => null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setState({ busy: true });
    const res = await fetch('/api/payments/flexpay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, planCode: plan.code, locale }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { url?: string; message?: string; error?: string } | undefined;
    if (!res?.ok) return setState({ busy: false, error: data?.error ?? t('error') });
    if (data?.url) return window.location.assign(data.url);
    setState({ busy: false, ok: data?.message || t('pushSent') });
  }

  const money = (c: number) => euros(c, `${locale}-CD`);
  const field = 'mt-2 w-full border border-white/20 bg-black px-3 py-3 text-white outline-none focus:border-white';

  return (
    <section id="packs" className="scroll-mt-16 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-5xl uppercase tracking-wide text-white md:text-6xl">{t('title')}</h2>
          <p className="text-neutral-400">{t('text')}</p>
          {returned && <p role="status" className={`mt-4 text-sm ${returned === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{t(`return_${returned}` as 'return_success')}</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.code} className="flex flex-col justify-between border border-white/10 bg-black/65 p-6 backdrop-blur-sm">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">{p.target[locale]}</p>
                <h3 className="mb-4 text-2xl font-bold uppercase text-white">{p.name}</h3>
                <p className="mb-4 flex items-end gap-2">
                  <span className="font-[family-name:var(--font-display)] text-4xl text-white">{money(p.priceCents)}</span>
                  <span className="pb-1 text-neutral-600 line-through">{money(p.valueCents)}</span>
                </p>
                <p className="mb-6 flex items-start gap-2 text-sm text-neutral-300"><Check className="h-4 w-4 shrink-0 text-graffiti" /> {p.desc[locale]}</p>
              </div>
              <button type="button" onClick={() => { setPlan(p); setState({ busy: false }); }}
                className="w-full border border-white/25 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black">{t('choose')}</button>
            </div>
          ))}
        </div>
      </div>

      {plan && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70" role="dialog" aria-modal="true" aria-label={t('checkoutTitle')}>
          <form onSubmit={submit} className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-ink p-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-white">{plan.name} — {money(plan.priceCents)}</p>
              <button type="button" aria-label={t('close')} onClick={() => setPlan(null)}><X className="text-white" /></button>
            </div>
            <p className="text-sm text-neutral-400">{t('checkoutText')}</p>
            {(['firstName', 'lastName', 'phone', 'email'] as const).map((k) => (
              <label key={k} className="block text-sm text-neutral-300">{t(k)}
                <input required={k !== 'email'} type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} value={form[k]}
                  placeholder={k === 'phone' ? '+243841938211' : undefined} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={field} />
              </label>
            ))}
            <label className="block text-sm text-neutral-300">{t('method')}
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={field}>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CARD">{t('card')}</option>
              </select>
            </label>
            {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
            {state.ok ? <p className="text-sm text-emerald-400">{state.ok}</p> : (
              <button disabled={state.busy} className="w-full bg-white py-4 font-bold uppercase tracking-wider text-black disabled:opacity-60">
                {state.busy ? t('processing') : t('pay', { amount: money(plan.priceCents) })}
              </button>
            )}
          </form>
        </div>
      )}
    </section>
  );
}
