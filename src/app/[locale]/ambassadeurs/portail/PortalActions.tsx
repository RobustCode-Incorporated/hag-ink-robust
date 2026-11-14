'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function SubmitDeliverable({ id }: { id: string }) {
  const t = useTranslations('Portal');
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [err, setErr] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch('/api/ambassadors/portal/deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, url }) });
    if (r.ok) router.refresh(); else setErr(true);
  }
  return (
    <form onSubmit={send} className="mt-2 flex gap-2">
      <input required type="url" placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)}
        className="min-w-0 flex-1 border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white" />
      <button className="bg-graffiti px-4 py-2 text-xs font-bold uppercase text-black">{t('send')}</button>
      {err && <span role="alert" className="self-center text-xs text-red-400">{t('sendError')}</span>}
    </form>
  );
}

export function Logout() {
  const t = useTranslations('Portal');
  const router = useRouter();
  return (
    <button type="button" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white"
      onClick={async () => { await fetch('/api/ambassadors/portal/logout', { method: 'POST' }); router.replace('/ambassadeurs'); }}>
      {t('logout')}
    </button>
  );
}
