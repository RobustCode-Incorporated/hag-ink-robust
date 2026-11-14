import { getTranslations, setRequestLocale } from 'next-intl/server';
import SiteNav from '@/components/site/SiteNav';
import { query, queryOne } from '@/lib/db';
import { currentAmbassador } from '@/lib/ambassador-portal';
import { SITE_URL } from '@/config/salon';
import { Logout, SubmitDeliverable } from './PortalActions';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

// Creator portal (spec 010, phase 7): own numbers only, no client identity, no internal cost.
export default async function PortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Portal');
  const amb = await currentAmbassador();
  const shell = (children: React.ReactNode) => (
    <main className="relative min-h-screen bg-ink">
      <SiteNav solid />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 text-neutral-200">{children}</div>
    </main>
  );
  if (!amb) return shell(<p className="text-lg">{t('noSession')}</p>);

  const [stats, code, allowances, deliverables] = await Promise.all([
    queryOne<{ visits: number; bookings: number; completed: number; new_clients: number }>(
      `SELECT (SELECT count(*)::int FROM referral_visits WHERE ambassador_id = $1) AS visits,
              count(b.*)::int AS bookings,
              count(*) FILTER (WHERE ap.status = 'COMPLETED')::int AS completed,
              count(*) FILTER (WHERE ap.status = 'COMPLETED' AND b.is_new_client)::int AS new_clients
         FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = $1`, [amb.id]),
    queryOne<{ code: string; percent: number; uses: number; max_uses: number | null; valid_until: string | null }>(
      `SELECT code, percent, uses, max_uses, to_char(valid_until,'YYYY-MM-DD') AS valid_until FROM promo_codes WHERE ambassador_id = $1 AND active ORDER BY created_at DESC LIMIT 1`, [amb.id]),
    query<{ id: string; service: string | null; available: number; consumed: number; valid_until: string | null }>(
      `SELECT sa.id, sv.name_fr AS service, to_char(sa.valid_until,'YYYY-MM-DD') AS valid_until,
              COALESCE((SELECT sum(qty) FROM allowance_ledger l WHERE l.allowance_id = sa.id), 0)::int AS available,
              (SELECT COALESCE(-sum(l.qty) FILTER (WHERE l.kind = 'CONSUMPTION'), 0)
                     - COALESCE(sum(l.qty) FILTER (WHERE l.kind = 'REVERSAL' AND t.kind = 'CONSUMPTION'), 0)
                FROM allowance_ledger l LEFT JOIN allowance_ledger t ON t.id = l.reverses_id WHERE l.allowance_id = sa.id)::int AS consumed
         FROM service_allowances sa LEFT JOIN services sv ON sv.id = sa.service_id WHERE sa.ambassador_id = $1 AND sa.status = 'APPROVED'`, [amb.id]),
    query<{ id: string; kind: string; title: string; due_date: string | null; status: string; url: string | null; review_note: string | null }>(
      `SELECT id, kind, title, to_char(due_date,'YYYY-MM-DD') AS due_date, status, url, review_note FROM deliverables WHERE ambassador_id = $1 ORDER BY created_at DESC`, [amb.id]),
  ]);
  const card = 'border border-white/10 bg-black/60 p-5';

  return shell(
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.5em] text-graffiti">{t('eyebrow')}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl uppercase text-white">{t('hello', { name: amb.display_name })}</h1>
        </div>
        <Logout />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([['visits', stats?.visits], ['bookings', stats?.bookings], ['completed', stats?.completed], ['newClients', stats?.new_clients]] as const).map(([k, v]) => (
          <div key={k} className={card}><p className="text-xs uppercase tracking-widest text-neutral-400">{t(k)}</p><p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-white">{v ?? 0}</p></div>
        ))}
      </div>
      <div className={`${card} mt-6 space-y-2`}>
        <p className="text-xs uppercase tracking-widest text-neutral-400">{t('yourLink')}</p>
        <p className="break-all font-mono text-sm text-white">{SITE_URL}/experience/{amb.slug}</p>
        {code && <p>{t('yourCode', { code: code.code, percent: code.percent })} · {t('uses', { n: code.uses })}{code.max_uses ? ` / ${code.max_uses}` : ''}{code.valid_until ? ` · ${t('until', { date: code.valid_until })}` : ''}</p>}
      </div>
      <div className={`${card} mt-6`}>
        <p className="mb-3 text-xs uppercase tracking-widest text-neutral-400">{t('allowances')}</p>
        {allowances.length === 0 ? <p className="text-sm text-neutral-400">{t('noAllowance')}</p> : allowances.map((a) => (
          <p key={a.id}>{t('allowanceLine', { service: a.service ?? t('anyService'), available: a.available, consumed: a.consumed })}{a.valid_until ? ` · ${t('until', { date: a.valid_until })}` : ''}</p>
        ))}
      </div>
      <div className={`${card} mt-6`}>
        <p className="mb-3 text-xs uppercase tracking-widest text-neutral-400">{t('deliverables')}</p>
        {deliverables.length === 0 && <p className="text-sm text-neutral-400">{t('noDeliverable')}</p>}
        <ul className="space-y-4">
          {deliverables.map((d) => (
            <li key={d.id}>
              <p className="text-white">{d.kind} · {d.title}{d.due_date ? ` · ${t('until', { date: d.due_date })}` : ''} — <span className="text-graffiti">{t(`status_${d.status}` as 'status_EXPECTED')}</span></p>
              {d.review_note && <p className="text-xs text-neutral-400">{d.review_note}</p>}
              {(d.status === 'EXPECTED' || d.status === 'REJECTED') && <SubmitDeliverable id={d.id} />}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-xs text-neutral-500">{t('privacy')}</p>
    </>,
  );
}
