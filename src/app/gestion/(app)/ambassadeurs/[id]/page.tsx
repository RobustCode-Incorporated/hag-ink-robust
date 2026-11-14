import Link from 'next/link';
import PortalLink from './PortalLink';
import { notFound } from 'next/navigation';
import { Badge, Card, Field, Flash, PageHeader, Stat, Table, btn, btnDanger, btnGhost, input } from '@/components/gestion/ui';
import { requireRole, MANAGERS } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { SITE_URL } from '@/config/salon';
import { CRITERIA, RECO_LABEL, allowanceBalance, latestScores, scoreOf, type Recommendation, type Scores } from '@/domain/ambassador-program';
import {
  addAssessmentAction, addDeliverableAction, adjustAllowanceAction, decideAllowanceAction, proposeAllowanceAction, reviewDeliverableAction,
} from '../../../actions';

export const metadata = { title: 'Ambassadeur' };
const KIND: Record<string, string> = { ALLOCATION: 'Allocation', CONSUMPTION: 'Prestation réalisée', EXPIRATION: 'Expiration', ADJUSTMENT: 'Ajustement', REVERSAL: 'Annulation d’écriture' };
const DSTATUS: Record<string, [string, 'neutral' | 'warn' | 'ok' | 'danger']> = { EXPECTED: ['attendu', 'neutral'], SUBMITTED: ['à valider', 'warn'], APPROVED: ['validé', 'ok'], REJECTED: ['refusé', 'danger'] };

export default async function AmbassadorDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const user = await requireRole(...MANAGERS);
  const isOwner = user.role === 'OWNER';
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const amb = await queryOne<{ id: string; display_name: string; slug: string; phone: string; instagram: string | null; tiktok: string | null; active: boolean; portal_token_at: Date | null }>(
    'SELECT id, display_name, slug, phone, instagram, tiktok, active, portal_token_at FROM ambassadors WHERE id = $1', [id]);
  if (!amb) notFound();

  const [allowances, ledger, deliverables, assessments, services, stats] = await Promise.all([
    query<{ id: string; quantity: number; status: string; reason: string | null; valid_until: string | null; service: string | null; created_at: Date }>(
      `SELECT sa.id, sa.quantity, sa.status, sa.reason, to_char(sa.valid_until,'YYYY-MM-DD') AS valid_until, sv.name_fr AS service, sa.created_at
         FROM service_allowances sa LEFT JOIN services sv ON sv.id = sa.service_id WHERE sa.ambassador_id = $1 ORDER BY sa.created_at DESC`, [id]),
    query<{ id: string; allowance_id: string; kind: string; qty: number; reverses_id: string | null; reason: string | null; created_at: Date; author: string | null }>(
      `SELECT l.id, l.allowance_id, l.kind, l.qty, l.reverses_id, l.reason, l.created_at, st.display_name AS author
         FROM allowance_ledger l JOIN service_allowances sa ON sa.id = l.allowance_id LEFT JOIN staff st ON st.id = l.created_by
        WHERE sa.ambassador_id = $1 ORDER BY l.id`, [id]),
    query<{ id: string; kind: string; title: string; due_date: string | null; status: string; url: string | null; review_note: string | null }>(
      `SELECT id, kind, title, to_char(due_date,'YYYY-MM-DD') AS due_date, status, url, review_note FROM deliverables WHERE ambassador_id = $1 ORDER BY created_at DESC`, [id]),
    query<{ id: string; phase: string; criteria: Scores; score: string | null; recommendation: string | null; override_reason: string | null; created_at: Date; author: string | null }>(
      `SELECT a.id, a.phase, a.criteria, a.score, a.recommendation, a.override_reason, a.created_at, st.display_name AS author
         FROM score_assessments a LEFT JOIN staff st ON st.id = a.created_by WHERE a.ambassador_id = $1 ORDER BY a.id`, [id]),
    query<{ id: string; name_fr: string }>('SELECT id, name_fr FROM services WHERE active ORDER BY sort'),
    queryOne<{ bookings: number; completed: number; acquisitions: number }>(
      `SELECT count(*)::int AS bookings, count(*) FILTER (WHERE ap.status = 'COMPLETED')::int AS completed,
              count(*) FILTER (WHERE ap.status = 'COMPLETED' AND b.is_new_client)::int AS acquisitions
         FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = $1`, [id]),
  ]);

  const global = scoreOf(latestScores(assessments));

  return (
    <>
      <PageHeader title={amb.display_name} subtitle={`${amb.phone}${amb.instagram ? ` · @${amb.instagram}` : ''}${amb.tiktok ? ` · TikTok @${amb.tiktok}` : ''} · lien ${SITE_URL}/experience/${amb.slug}`}
        actions={<Link href="/gestion/ambassadeurs" className={btnGhost}>← Tous les ambassadeurs</Link>} />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Réservations" value={String(stats?.bookings ?? 0)} />
        <Stat label="Réalisées" value={String(stats?.completed ?? 0)} />
        <Stat label="Nouveaux clients" value={String(stats?.acquisitions ?? 0)} />
        <Stat label="Score global" value={global.score === null ? '—' : `${global.score}/100`} hint={global.recommendation ? RECO_LABEL[global.recommendation] : global.missing.length ? `${global.missing.length} critère(s) non noté(s)` : undefined} />
      </div>

      <Card title="Portail personnel de l’ambassadeur" className="mt-6">
        <p className="text-sm text-neutral-600">{amb.portal_token_at ? `Lien créé le ${amb.portal_token_at.toISOString().slice(0, 10)}.` : 'Aucun lien créé.'} Le portail montre ses chiffres, son code, ses enveloppes et ses contenus, jamais l’identité des clients ni les coûts.</p>
        <PortalLink ambassadorId={id} name={amb.display_name} hasLink={!!amb.portal_token_at} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Proposer une enveloppe de prestations">
          <form action={proposeAllowanceAction} className="space-y-3">
            <input type="hidden" name="ambassadorId" value={id} />
            <Field label="Prestation"><select name="serviceId" className={input}><option value="">Toute prestation</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name_fr}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre"><input name="quantity" defaultValue={2} inputMode="numeric" className={input} /></Field>
              <Field label="Valable jusqu’au"><input name="validUntil" type="date" className={input} /></Field>
            </div>
            <Field label="Raison"><input name="reason" required maxLength={300} placeholder="ex. 2 reels en novembre" className={input} /></Field>
            <button className={`${btn} w-full`}>Proposer</button>
            <p className="text-xs text-neutral-500">Une enveloppe n’est ni de l’argent ni un moyen de paiement. Seule la direction la valide ; aucun score ne l’attribue automatiquement.</p>
          </form>
        </Card>
        <Card title="Enveloppes" className="lg:col-span-2">
          {allowances.length === 0 && <p className="text-sm text-neutral-500">Aucune enveloppe.</p>}
          <div className="space-y-4">
            {allowances.map((a) => {
              const entries = ledger.filter((l) => l.allowance_id === a.id);
              const bal = allowanceBalance(entries.map((l) => ({ id: Number(l.id), kind: l.kind as 'ALLOCATION', qty: l.qty, reversesId: l.reverses_id ? Number(l.reverses_id) : null })));
              const reversed = new Set(entries.map((l) => l.reverses_id).filter(Boolean));
              return (
                <div key={a.id} className="rounded-lg border border-rem-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p><b>{a.quantity} × {a.service ?? 'toute prestation'}</b>{a.valid_until && ` · jusqu’au ${a.valid_until}`} <span className="text-xs text-neutral-500">· {a.reason}</span></p>
                    {a.status === 'APPROVED' ? <Badge tone="ok">disponible {bal.available} · réalisées {bal.consumed}</Badge> : <Badge tone={a.status === 'PROPOSED' ? 'warn' : 'danger'}>{a.status === 'PROPOSED' ? 'à valider' : 'refusée'}</Badge>}
                  </div>
                  {a.status === 'PROPOSED' && isOwner && (
                    <div className="mt-2 flex gap-2">
                      {(['APPROVED', 'REJECTED'] as const).map((d) => (
                        <form key={d} action={decideAllowanceAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ambassadorId" value={id} /><input type="hidden" name="decision" value={d} />
                          <button className={d === 'APPROVED' ? btn : btnDanger}>{d === 'APPROVED' ? 'Valider' : 'Refuser'}</button></form>
                      ))}
                    </div>
                  )}
                  {entries.length > 0 && (
                    <Table head={['#', 'Écriture', 'Qté', 'Raison', 'Par', 'Date', '']}>
                      {entries.map((l) => (
                        <tr key={l.id}>
                          <td className="px-2 py-1 text-xs">{l.id}</td><td className="px-2 py-1 text-xs">{KIND[l.kind]}{l.reverses_id ? ` de #${l.reverses_id}` : ''}</td>
                          <td className="px-2 py-1">{l.qty > 0 ? `+${l.qty}` : l.qty}</td><td className="px-2 py-1 text-xs">{l.reason}</td>
                          <td className="px-2 py-1 text-xs">{l.author ?? '—'}</td><td className="px-2 py-1 text-xs">{l.created_at.toISOString().slice(0, 10)}</td>
                          <td className="px-2 py-1">{isOwner && l.kind !== 'REVERSAL' && !reversed.has(l.id) && (
                            <form action={adjustAllowanceAction} className="flex gap-1"><input type="hidden" name="op" value="reverse" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ambassadorId" value={id} /><input type="hidden" name="entryId" value={l.id} />
                              <input name="reason" required placeholder="raison" className={`${input} w-28 py-1 text-xs`} /><button className={btnDanger}>Annuler</button></form>)}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                  {a.status === 'APPROVED' && isOwner && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={adjustAllowanceAction} className="flex items-end gap-1"><input type="hidden" name="op" value="adjust" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ambassadorId" value={id} />
                        <input name="qty" placeholder="+1 / −1" className={`${input} w-20`} /><input name="reason" required placeholder="raison" className={`${input} w-40`} /><button className={btnGhost}>Ajuster</button></form>
                      <form action={adjustAllowanceAction} className="flex items-end gap-1"><input type="hidden" name="op" value="expire" /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="ambassadorId" value={id} />
                        <input name="reason" required placeholder="raison" className={`${input} w-40`} /><button className={btnDanger}>Faire expirer le solde</button></form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Demander un contenu">
          <form action={addDeliverableAction} className="space-y-3">
            <input type="hidden" name="ambassadorId" value={id} />
            <Field label="Type"><select name="kind" className={input}>{['REEL', 'POST', 'STORY', 'TIKTOK', 'AUTRE'].map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Description"><input name="title" required maxLength={200} placeholder="ex. Reel avant/après locks" className={input} /></Field>
            <Field label="Pour le"><input name="dueDate" type="date" className={input} /></Field>
            <button className={`${btn} w-full`}>Demander</button>
          </form>
        </Card>
        <Card title="Contenus" className="lg:col-span-2">
          <Table head={['Type', 'Contenu', 'Pour le', 'Lien', 'Statut', '']} empty={deliverables.length === 0 && 'Aucun contenu demandé.'}>
            {deliverables.map((d) => (
              <tr key={d.id}>
                <td className="px-2 py-2 text-xs">{d.kind}</td><td className="px-2 py-2">{d.title}{d.review_note && <p className="text-xs text-neutral-500">{d.review_note}</p>}</td>
                <td className="px-2 py-2 text-xs">{d.due_date ?? '—'}</td>
                <td className="px-2 py-2 text-xs">{d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">voir</a> : '—'}</td>
                <td className="px-2 py-2"><Badge tone={DSTATUS[d.status][1]}>{DSTATUS[d.status][0]}</Badge></td>
                <td className="px-2 py-2">{d.status === 'SUBMITTED' && (
                  <div className="flex gap-1">{(['APPROVED', 'REJECTED'] as const).map((s) => (
                    <form key={s} action={reviewDeliverableAction} className="flex gap-1"><input type="hidden" name="id" value={d.id} /><input type="hidden" name="ambassadorId" value={id} /><input type="hidden" name="decision" value={s} />
                      {s === 'REJECTED' && <input name="note" placeholder="pourquoi" className={`${input} w-28 py-1 text-xs`} />}<button className={s === 'APPROVED' ? btnGhost : btnDanger}>{s === 'APPROVED' ? 'Valider' : 'Refuser'}</button></form>))}</div>
                )}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Nouvelle évaluation">
          <form action={addAssessmentAction} className="space-y-3">
            <input type="hidden" name="ambassadorId" value={id} />
            <Field label="Évaluation"><select name="phase" className={input}><option value="POTENTIAL">Potentiel (avant collaboration)</option><option value="PERFORMANCE">Performance (après campagne)</option></select></Field>
            {CRITERIA.map((c) => <Field key={c.key} label={`${c.label} (/${c.max})`}><input name={c.key} inputMode="numeric" placeholder="vide = non noté" className={input} /></Field>)}
            <Field label="Dérogation (optionnel)"><select name="override" className={input}><option value="">Aucune</option>{(Object.keys(RECO_LABEL) as Recommendation[]).map((r) => <option key={r} value={r}>{RECO_LABEL[r]}</option>)}</select></Field>
            <Field label="Raison de la dérogation"><input name="overrideReason" maxLength={300} className={input} /></Field>
            <button className={`${btn} w-full`}>Enregistrer</button>
            <p className="text-xs text-neutral-500">Un critère vide est « non noté », jamais zéro. Pas de recommandation tant qu’un critère de la phase manque. Historique non modifiable.</p>
          </form>
        </Card>
        <Card title="Historique des évaluations" className="lg:col-span-2">
          <Table head={['Date', 'Phase', ...CRITERIA.map((c) => c.label.split(' ')[0]), 'Score', 'Recommandation', 'Par']} empty={assessments.length === 0 && 'Aucune évaluation.'}>
            {assessments.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-2 text-xs">{a.created_at.toISOString().slice(0, 10)}</td><td className="px-2 py-2 text-xs">{a.phase === 'POTENTIAL' ? 'Potentiel' : 'Performance'}</td>
                {CRITERIA.map((c) => <td key={c.key} className="px-2 py-2 text-xs">{typeof a.criteria[c.key] === 'number' ? `${a.criteria[c.key]}/${c.max}` : '—'}</td>)}
                <td className="px-2 py-2">{a.score ?? '—'}</td>
                <td className="px-2 py-2 text-xs">{a.recommendation ? RECO_LABEL[a.recommendation as Recommendation] : 'incomplète'}{a.override_reason && <p className="text-amber-700">dérogation : {a.override_reason}</p>}</td>
                <td className="px-2 py-2 text-xs">{a.author ?? '—'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
