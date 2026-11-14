'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

/** Reads the secret from the URL fragment (never sent to server logs), exchanges it, then removes it from the address bar. */
export default function Access() {
  const t = useTranslations('Portal');
  const router = useRouter();
  const [error, setError] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // exchange the secret once, even if the effect runs again
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
    window.history.replaceState(null, '', window.location.pathname);
    // No token: the API answers 401 and the error shows from the promise callback.
    fetch('/api/ambassadors/portal/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token ?? '' }) })
      .then((r) => (r.ok ? router.replace('/ambassadeurs/portail') : setError(true)))
      .catch(() => setError(true));
  }, [router]);
  return <p className="text-lg text-neutral-200">{error ? t('linkInvalid') : t('opening')}</p>;
}
