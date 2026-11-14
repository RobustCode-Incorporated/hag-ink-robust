import { Badge, Card, Field, Flash, PageHeader, Stat, Table, btn, btnDanger, btnGhost, input } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import Link from 'next/link';
import { euros } from '@/lib/format';
import { SITE_URL } from '@/config/salon';
import { decideApplicationAction, toggleAmbassadorAction, updatePromoAction } from '../../actions';

export const metadata = { title: 'Ambassadeurs' };

// Spec 010, phases 1-3. Definitions shown on the page so the numbers are read the same way by everyone.
export default async function AmbassadeursPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const user = await requireRole('OWNER'); // manager: no access (owner decision 2026-11-14)
  const sp = await searchParams;
  const isOwner = user.role === 'OWNER';
  const todo = await query<{ id: string; name: string; what: string }>(
    `SELECT a.id, a.display_name AS name, 'enveloppe à valider' AS what FROM service_allowances sa JOIN ambassadors a ON a.id = sa.ambassador_id WHERE sa.status = 'PROPOSED'
     UNION ALL SELECT a.id, a.display_name, 'contenu à valider' FROM deliverables d JOIN ambassadors a ON a.id = d.ambassador_id WHERE d.status = 'SUBMITTED'`);
  const [apps, ambs] = await Promise.all([
    query<{ id: string; first_name: string; last_name: string; phone: string; instagram: string | null; tiktok: string | null; audience: string | null; motivation: string | null; created_at: Date }>(
      `SELECT id, first_name, last_name, phone, instagram, tiktok, audience, motivation, created_at FROM ambassador_applications WHERE status = 'PENDING' ORDER BY created_at`),
    query<{ id: string; display_name: string; slug: string; phone: string; instagram: string | null; tiktok: string | null; active: boolean;
      promo_id: string | null; code: string | null; percent: number | null; max_uses: number | null; uses: number | null; valid_until: string | null; promo_active: boolean | null;
      visits: number; bookings: number; completed: number; acquisitions: number; conflicts: number; revenue_cents: number; discount_cents: number }>(
      `SELECT a.id, a.display_name, a.slug, a.phone, a.instagram, a.tiktok, a.active,
              p.id AS promo_id, p.code, p.percent, p.max_uses, p.uses, to_char(p.valid_until,'YYYY-MM-DD') AS valid_until, p.active AS promo_active,
              (SELECT count(*)::int FROM referral_visits v WHERE v.ambassador_id = a.id) AS visits,
              (SELECT count(*)::int FROM booking_attributions b WHERE b.ambassador_id = a.id) AS bookings,
              (SELECT count(*)::int FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = a.id AND ap.status = 'COMPLETED') AS completed,
              (SELECT count(*)::int FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = a.id AND ap.status = 'COMPLETED' AND b.is_new_client) AS acquisitions,
              (SELECT count(*)::int FROM booking_attributions b WHERE b.ambassador_id = a.id AND b.has_conflict) AS conflicts,
              (SELECT COALESCE(sum(sa.amount_cents),0)::int FROM booking_attributions b JOIN sales sa ON sa.appointment_id = b.appointment_id AND sa.voided_at IS NULL WHERE b.ambassador_id = a.id) AS revenue_cents,
              (SELECT COALESCE(sum(r.discount_cents),0)::int FROM promo_redemptions r JOIN promo_codes pc ON pc.id = r.promo_code_id WHERE pc.ambassador_id = a.id) AS discount_cents
         FROM ambassadors a LEFT JOIN LATERAL (SELECT * FROM promo_codes WHERE ambassador_id = a.id ORDER BY created_at DESC LIMIT 1) p ON true
        ORDER BY a.active DESC, a.created_at`),
  ]);
  const sum = (k: 'visits' | 'bookings' | 'completed' | 'acquisitions' | 'revenue_cents' | 'discount_cents') => ambs.reduce((n, a) => n + a[k], 0);

  return (
    <>
      <PageHeader title="Ambassadeurs · UGC" subtitle={`Candidatures, liens personnels et codes promo. Page publique de candidature : ${SITE_URL}/ambassadeurs`}
        actions={<div className="flex gap-2">{([['ambassadors', 'Export ambassadeurs (CSV)'], ['bookings', 'Export réservations (CSV)']] as const).map(([type, label]) => (
          <form key={type} action="/api/gestion/ambassadeurs/export" method="get"><input type="hidden" name="type" value={type} /><button className={btnGhost}>{label}</button></form>))}</div>} />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Ambassadeurs actifs" value={String(ambs.filter((a) => a.active).length)} />
        <Stat label="Visites des liens" value={String(sum('visits'))} />
        <Stat label="Réservations" value={String(sum('bookings'))} />
        <Stat label="Réalisées" value={String(sum('completed'))} />
        <Stat label="Nouveaux clients" value={String(sum('acquisitions'))} />
        <Stat label="CA réalisé" value={euros(sum('revenue_cents'))} hint={isOwner ? `remises ${euros(sum('discount_cents'))}` : undefined} />
      </div>

      {todo.length > 0 && (
        <Card title={`À valider (${todo.length})`} className="mt-6">
          <ul className="space-y-1 text-sm">{todo.map((t, i) => <li key={i}><Link href={`/gestion/ambassadeurs/${t.id}`} className="underline">{t.name}</Link> · {t.what}</li>)}</ul>
        </Card>
      )}

      <Card title={`Candidatures à étudier (${apps.length})`} className="mt-6">
        {apps.length === 0 && <p className="text-sm text-neutral-500">Aucune candidature en attente.</p>}
        <div className="space-y-4">
          {apps.map((a) => (
            <div key={a.id} className="rounded-lg border border-rem-line p-4">
              <p className="font-semibold">{a.first_name} {a.last_name} · <span className="text-sm font-normal">{a.phone}</span></p>
              <p className="text-sm text-neutral-600">{a.instagram && `Instagram @${a.instagram}`}{a.instagram && a.tiktok && ' · '}{a.tiktok && `TikTok @${a.tiktok}`}{a.audience && ` · ${a.audience}`}</p>
              {a.motivation && <p className="mt-1 text-sm">{a.motivation}</p>}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <form action={decideApplicationAction} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="APPROVED" />
                  <Field label="Remise du code (%)"><input name="percent" defaultValue={10} inputMode="numeric" className={`${input} w-24`} /></Field>
                  <button className={btn}>Accepter</button>
                </form>
                <form action={decideApplicationAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="REJECTED" /><button className={btnDanger}>Refuser</button></form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Ambassadeurs" className="mt-6">
        <Table head={['Ambassadeur', 'Lien à partager', 'Code', 'Visites', 'Réserv.', 'Réalisées', 'Nouveaux', 'CA', '']} empty={ambs.length === 0 && 'Aucun ambassadeur pour l’instant.'}>
          {ambs.map((a) => (
            <tr key={a.id} className={a.active ? '' : 'opacity-50'}>
              <td className="px-2 py-2"><Link href={`/gestion/ambassadeurs/${a.id}`} className="font-semibold underline">{a.display_name}</Link><br /><span className="text-xs text-neutral-500">{a.phone}{a.instagram ? ` · @${a.instagram}` : ''}</span></td>
              <td className="px-2 py-2 font-mono text-xs">{SITE_URL}/experience/{a.slug}</td>
              <td className="px-2 py-2">
                {a.code ? <><b className="font-mono">{a.code}</b> −{a.percent} %<br /><span className="text-xs text-neutral-500">{a.uses}{a.max_uses ? `/${a.max_uses}` : ''} utilisés{a.valid_until ? ` · jusqu’au ${a.valid_until}` : ''}</span></> : '—'}
                {a.conflicts > 0 && <div><Badge tone="warn">{a.conflicts} conflit(s) lien/code</Badge></div>}
              </td>
              <td className="px-2 py-2">{a.visits}</td>
              <td className="px-2 py-2">{a.bookings}</td>
              <td className="px-2 py-2">{a.completed}</td>
              <td className="px-2 py-2">{a.acquisitions}</td>
              <td className="px-2 py-2">{euros(a.revenue_cents)}{isOwner && a.discount_cents > 0 && <><br /><span className="text-xs text-neutral-500">remises {euros(a.discount_cents)}</span></>}</td>
              <td className="px-2 py-2">
                <details>
                  <summary className="cursor-pointer text-xs underline">Gérer</summary>
                  {a.promo_id && (
                    <form action={updatePromoAction} className="mt-2 w-56 space-y-2">
                      <input type="hidden" name="id" value={a.promo_id} />
                      <Field label="Remise %"><input name="percent" defaultValue={a.percent ?? 10} inputMode="numeric" className={input} /></Field>
                      <Field label="Utilisations max (vide = illimité)"><input name="maxUses" defaultValue={a.max_uses ?? ''} inputMode="numeric" className={input} /></Field>
                      <Field label="Valable jusqu’au"><input name="validUntil" type="date" defaultValue={a.valid_until ?? ''} className={input} /></Field>
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="active" defaultChecked={a.promo_active ?? true} /> Code actif</label>
                      <button className={`${btnGhost} w-full`}>Enregistrer le code</button>
                    </form>
                  )}
                  <form action={toggleAmbassadorAction} className="mt-2"><input type="hidden" name="id" value={a.id} /><button className={a.active ? btnDanger : btnGhost}>{a.active ? 'Mettre en pause' : 'Réactiver'}</button></form>
                </details>
              </td>
            </tr>
          ))}
        </Table>
        <p className="mt-4 text-xs text-neutral-500">
          Visite = ouverture du lien personnel (sans cookie ni donnée personnelle, aperçus WhatsApp/Facebook exclus). Réalisée = rendez-vous encaissé.
          Nouveau client = client sans passage ni achat avant ce rendez-vous. CA = montant encaissé des rendez-vous attribués, après remise.
          Lien d’un ambassadeur + code d’un autre : attribué au lien, signalé en conflit.
        </p>
      </Card>
    </>
  );
}
