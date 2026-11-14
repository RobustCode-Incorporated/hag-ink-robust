import Link from 'next/link';
import { Card, Field, Flash, PageHeader, Stat, input, btn } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { euros } from '@/lib/format';
import { feedToken } from '@/lib/ics';
import { monthRange } from '@/lib/period';
import { salonDate, salonTime } from '@/lib/timezone';
import { computePayroll } from '@/domain/payroll';
import { SITE_URL } from '@/config/salon';
import { changeOwnPasswordAction } from '../../actions';

export const metadata = { title: 'Mon espace' };

export default async function MoiPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const user = await requireRole('OWNER', 'BARBER'); // no "Mon espace" for the manager
  const sp = await searchParams;
  const { from, to } = monthRange(salonDate(new Date()).slice(0, 7));
  const [me, sales, upcoming] = await Promise.all([
    queryOne<{ pay_type: 'COMMISSION' | 'FIXED'; commission_rate: string; fixed_salary_cents: number; bookable: boolean }>(
      'SELECT pay_type, commission_rate, fixed_salary_cents, bookable FROM staff WHERE id = $1', [user.id]),
    query<{ kind: 'SERVICE' | 'PRODUCT'; amount_cents: number; tip_cents: number }>(
      'SELECT kind, amount_cents, tip_cents FROM sales WHERE staff_id = $1 AND voided_at IS NULL AND created_at >= $2 AND created_at < $3', [user.id, from, to]),
    query<{ starts_at: Date; service: string; first_name: string }>(
      `SELECT a.starts_at, sv.name_fr AS service, c.first_name FROM appointments a JOIN services sv ON sv.id=a.service_id JOIN clients c ON c.id=a.client_id
        WHERE a.staff_id = $1 AND a.status='BOOKED' AND a.starts_at > now() ORDER BY a.starts_at LIMIT 15`, [user.id]),
  ]);
  const pay = me ? computePayroll(
    [{ id: user.id, name: user.name, payType: me.pay_type, commissionRate: Number(me.commission_rate), fixedSalaryCents: me.fixed_salary_cents }],
    sales.map((s) => ({ staffId: user.id, kind: s.kind, amountCents: s.amount_cents, tipCents: s.tip_cents })),
  ).lines[0] : null;

  return (
    <>
      <PageHeader title={`Bonjour ${user.name}`} subtitle="Ton activité du mois et tes prochains rendez-vous." />
      <Flash msg={sp.msg} error={sp.error} />
      {pay && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Prestations ce mois" value={String(pay.serviceCount)} />
          <Stat label="CA prestations" value={euros(pay.serviceRevenueCents)} />
          <Stat label="Pourboires" value={euros(pay.tipsCents)} />
          <Stat label="Ma rémunération (estim.)" value={euros(pay.totalDueCents)} tone="ok" />
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Mes prochains rendez-vous" actions={<Link href="/gestion/agenda" className="text-xs underline">Agenda</Link>}>
          <ul className="divide-y divide-[#eee] text-sm">
            {upcoming.map((a, i) => <li key={i} className="py-2"><b>{salonDate(a.starts_at).slice(5)} {salonTime(a.starts_at)}</b> · {a.first_name} · {a.service}</li>)}
            {upcoming.length === 0 && <li className="py-2 text-neutral-400">Aucun rendez-vous à venir.</li>}
          </ul>
          {me?.bookable && (
            <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs">
              <p className="mb-1 font-semibold">Mes rendez-vous dans mon téléphone</p>
              <p className="mb-2 text-neutral-500">iPhone : Réglages → Calendrier → Comptes → Ajouter un calendrier avec abonnement. Google : « À partir de l&apos;URL ».</p>
              <code className="break-all">{`${SITE_URL.replace(/^https?/, 'webcal')}/api/calendar/${user.id}?token=${feedToken(user.id)}`}</code>
            </div>
          )}
        </Card>
        <Card title="Changer mon mot de passe">
          <form action={changeOwnPasswordAction} className="space-y-3">
            <Field label="Mot de passe actuel"><input type="password" name="current" required autoComplete="current-password" className={input} /></Field>
            <Field label="Nouveau (10 caractères min.)"><input type="password" name="next" required minLength={10} autoComplete="new-password" className={input} /></Field>
            <button className={`${btn} w-full`}>Modifier</button>
          </form>
        </Card>
      </div>
    </>
  );
}
