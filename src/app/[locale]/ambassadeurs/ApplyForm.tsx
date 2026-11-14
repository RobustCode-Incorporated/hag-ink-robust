'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

const inputCls = 'w-full border border-white/15 bg-black/60 px-4 py-3 text-white outline-none placeholder:text-neutral-500 focus:border-white';

export default function ApplyForm() {
  const t = useTranslations('Ambassadors');
  const [f, setF] = useState({ firstName: '', lastName: '', phone: '', email: '', instagram: '', tiktok: '', audience: '', motivation: '', consent: false, website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending'); setError(null);
    const res = await fetch('/api/ambassadors/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    if (res.ok) { setState('done'); return; }
    const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'generic';
    setError(t.has(`errors.${code}`) ? t(`errors.${code}` as 'errors.generic') : t('errors.generic'));
    setState('idle');
  }

  if (state === 'done') return <p role="status" className="border border-white/15 bg-black/70 p-6 text-lg text-white">{t('thanks')}</p>;
  return (
    <form onSubmit={submit} className="space-y-3 border border-white/10 bg-black/70 p-6 backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder={`${t('firstName')} *`} className={inputCls} value={f.firstName} onChange={set('firstName')} />
        <input placeholder={t('lastName')} className={inputCls} value={f.lastName} onChange={set('lastName')} />
      </div>
      <input required type="tel" placeholder={`${t('phone')} *`} className={inputCls} value={f.phone} onChange={set('phone')} />
      <input type="email" placeholder={t('email')} className={inputCls} value={f.email} onChange={set('email')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder={t('instagram')} className={inputCls} value={f.instagram} onChange={set('instagram')} />
        <input placeholder={t('tiktok')} className={inputCls} value={f.tiktok} onChange={set('tiktok')} />
      </div>
      <input placeholder={t('audience')} className={inputCls} value={f.audience} onChange={set('audience')} />
      <textarea rows={3} maxLength={1000} placeholder={t('motivation')} className={inputCls} value={f.motivation} onChange={set('motivation')} />
      <input tabIndex={-1} autoComplete="off" className="hidden" aria-hidden value={f.website} onChange={set('website')} />
      <label className="flex items-start gap-3 text-sm text-neutral-300">
        <input type="checkbox" className="mt-1 accent-[#ffb21e]" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
        {t('consent')}
      </label>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button disabled={state === 'sending'} className="w-full bg-graffiti px-6 py-4 font-bold uppercase tracking-wider text-black disabled:opacity-50">
        {state === 'sending' ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
