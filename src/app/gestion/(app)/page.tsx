import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, PageHeader, Stat, Table, Badge } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { euros } from '@/lib/format';
import { PERIODS, periodRange } from '@/lib/period';
import { salonDate, salonTime, salonToUtc, addDays } from '@/lib/timezone';
import { computePayroll } from '@/domain/payroll';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Tableau de bord' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await requireRole();
  if (user.role === 'BARBER') redirect('/gestion/moi');
  const isOwner = user.role === 'OWNER';
  const period = periodRange((await searchParams).p);
  const range = [period.from, period.to];

  const [totals, expenses, byStaff, byDay, recent, appts, staff, today, lowStock, pending] = await Promise.all([
    queryOne<{ services: number; products: number; tips: number; count: number; cash: number; card: number }>(
      `SELECT COALESCE(sum(amount_cents) FILTER (WHERE kind='SERVICE'),0)::int AS services,
              COALESCE(sum(amount_cents) FILTER (WHERE kind='PRODUCT'),0)::int AS products,
              COALESCE(sum(tip_cents),0)::int AS tips,
              count(*) FILTER (WHERE kind='SERVICE')::int AS count,
              COALESCE(sum(amount_cents) FILTER (WHERE payment_method='CASH'),0)::int AS cash,
              COALESCE(sum(amount_cents) FILTER (WHERE payment_method='CARD'),0)::int AS card
         FROM sales WHERE voided_at IS NULL AND created_at >= $1 AND created_at < $2`, range),
    queryOne<{ total: number }>(
      `SELECT COALESCE(sum(amount_cents),0)::int AS total FROM expenses WHERE status='APPROVED'
        AND spent_on >= ($1 AT TIME ZONE '${SALON.timezone}')::date AND spent_on < ($2 AT TIME ZONE '${SALON.timezone}')::date`, range),
    query<{ staff_id: string; name: string; revenue: number; count: number }>(
      `SELECT st.id AS staff_id, st.display_name AS name, COALESCE(sum(s.amount_cents),0)::int AS revenue, count(s.id)::int AS count
         FROM staff st JOIN sales s ON s.staff_id = st.id AND s.voided_at IS NULL AND s.kind='SERVICE' AND s.created_at >= $1 AND s.created_at < $2
        GROUP BY st.id ORDER BY revenue DESC`, range),
    query<{ day: string; revenue: number }>(
      `SELECT to_char(created_at AT TIME ZONE '${SALON.timezone}', 'YYYY-MM-DD') AS day, sum(amount_cents)::int AS revenue
         FROM sales WHERE voided_at IS NULL AND created_at >= $1 AND created_at < $2 GROUP BY 1 ORDER BY 1`,
      [salonToUtc(addDays(salonDate(new Date()), -29), '00:00'), salonToUtc(addDays(salonDate(new Date()), 1), '00:00')]),
    query<{ id: string; created_at: Date; kind: string; label: string; staff: string; amount_cents: number; payment_method: string }>(
      `SELECT s.id, s.created_at, s.kind, COALESCE(sv.name_fr, p.name) AS label, st.display_name AS staff, s.amount_cents, s.payment_method
         FROM sales s JOIN staff st ON st.id = s.staff_id LEFT JOIN services sv ON sv.id = s.service_id LEFT JOIN products p ON p.id = s.product_id
        WHERE s.voided_at IS NULL ORDER BY s.created_at DESC LIMIT 8`),
    queryOne<{ total: number; online: number; noshow: number; cancelled: number }>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE source='ONLINE')::int AS online,
              count(*) FILTER (WHERE status='NO_SHOW')::int AS noshow, count(*) FILTER (WHERE status='CANCELLED')::int AS cancelled
         FROM appointments WHERE starts_at >= $1 AND starts_at < $2`, range),
    query<{ id: string; display_name: string; pay_type: 'COMMISSION' | 'FIXED'; commission_rate: string; fixed_salary_cents: number }>(
      `SELECT id, display_name, pay_type, commission_rate, fixed_salary_cents FROM staff WHERE active`),
    query<{ starts_at: Date; first_name: string; service: string; staff: string; status: string }>(
      `SELECT a.starts_at, c.first_name, sv.name_fr AS service, st.display_name AS staff, a.status
         FROM appointments a JOIN clients c ON c.id=a.client_id JOIN services sv ON sv.id=a.service_id JOIN staff st ON st.id=a.staff_id
        WHERE a.starts_at >= $1 AND a.starts_at < $2 AND a.status IN ('BOOKED','COMPLETED') ORDER BY a.starts_at`,
      [salonToUtc(salonDate(new Date()), '00:00'), salonToUtc(addDays(salonDate(new Date()), 1), '00:00')]),
    query<{ name: string; stock_qty: number }>('SELECT name, stock_qty FROM products WHERE active AND stock_qty <= low_stock_threshold ORDER BY stock_qty'),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM expenses WHERE status='PENDING'`),
  ]);

  const sales = await query<{ staff_id: string; kind: 'SERVICE' | 'PRODUCT'; amount_cents: number; tip_cents: number }>(
    'SELECT staff_id, kind, amount_cents, tip_cents FROM sales WHERE voided_at IS NULL AND created_at >= $1 AND created_at < $2', range);
  const payroll = computePayroll(
    staff.map((s) => ({ id: s.id, name: s.display_name, payType: s.pay_type, commissionRate: Number(s.commission_rate), fixedSalaryCents: 0 })),
    sales.map((s) => ({ staffId: s.staff_id, kind: s.kind, amountCents: s.amount_cents, tipCents: 0 })),
  );
  const revenue = (totals?.services ?? 0) + (totals?.products ?? 0);
  const commissions = payroll.lines.reduce((n, l) => n + l.commissionCents, 0);
  const net = revenue - commissions - (expenses?.total ?? 0);
  const maxDay = Math.max(1, ...byDay.map((d) => d.revenue));
  const maxStaff = Math.max(1, ...byStaff.map((d) => d.revenue));
  const days30 = Array.from({ length: 30 }, (_, i) => addDays(salonDate(new Date()), i - 29));

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`Période : ${period.label}`}
        actions={PERIODS.map((p) => (
          <Link key={p.key} href={`/gestion?p=${p.key}`} className={`rounded-full border px-3 py-1 text-xs ${p.key === period.key ? 'border-black bg-black text-white' : 'border-rem-line bg-white hover:border-black'}`}>{p.label}</Link>
        ))} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires" value={euros(revenue)} hint={`Prestations ${euros(totals?.services ?? 0)} · Produits ${euros(totals?.products ?? 0)}`} />
        <Stat label="Prestations" value={String(totals?.count ?? 0)} hint={`Panier moyen ${euros(totals?.count ? Math.round((totals.services) / totals.count) : 0)}`} />
        {isOwner ? (
          <>
            <Stat label="Dépenses validées" value={euros(expenses?.total ?? 0)} hint={`Commissions barbers ${euros(commissions)}`} />
            <Stat label="Résultat estimé" value={euros(net)} tone={net >= 0 ? 'ok' : 'danger'} hint="CA − commissions − dépenses" />
          </>
        ) : (
          <>
            <Stat label="Espèces" value={euros(totals?.cash ?? 0)} hint="À compter en caisse" />
            <Stat label="Carte" value={euros(totals?.card ?? 0)} hint={`Pourboires ${euros(totals?.tips ?? 0)}`} />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Rendez-vous" value={String(appts?.total ?? 0)} hint={`${appts?.total ? Math.round(((appts.online) / appts.total) * 100) : 0} % réservés en ligne`} />
        <Stat label="Absents (no-show)" value={String(appts?.noshow ?? 0)} tone={(appts?.noshow ?? 0) > 0 ? 'danger' : undefined} hint={`${appts?.cancelled ?? 0} annulations`} />
        <Stat label="Espèces / Carte" value={`${euros(totals?.cash ?? 0)} / ${euros(totals?.card ?? 0)}`} hint={`Pourboires ${euros(totals?.tips ?? 0)}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Chiffre d'affaires — 30 derniers jours" className="lg:col-span-2">
          <div className="flex h-44 items-end gap-1" role="img" aria-label="Chiffre d'affaires par jour">
            {days30.map((d) => {
              const v = byDay.find((x) => x.day === d)?.revenue ?? 0;
              return (
                <div key={d} className="group relative flex-1">
                  <div className="w-full rounded-t bg-black transition group-hover:bg-neutral-600" style={{ height: `${Math.max((v / maxDay) * 160, v ? 4 : 1)}px` }} />
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-0.5 text-[10px] text-white group-hover:block">{d.slice(5)} · {euros(v)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-neutral-400"><span>{days30[0].slice(5)}</span><span>Aujourd&apos;hui</span></div>
        </Card>
        <Card title="Par barber">
          {byStaff.length === 0 && <p className="text-sm text-neutral-400">Aucune prestation sur la période.</p>}
          <ul className="space-y-3">
            {byStaff.map((b) => (
              <li key={b.staff_id}>
                <div className="flex justify-between text-sm"><span>{b.name}</span><span>{euros(b.revenue)} · {b.count}</span></div>
                <div className="mt-1 h-1.5 rounded bg-neutral-100"><div className="h-1.5 rounded bg-black" style={{ width: `${(b.revenue / maxStaff) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={`Aujourd'hui — ${today.length} rendez-vous`} actions={<Link href="/gestion/agenda" className="text-xs underline">Agenda</Link>}>
          <ul className="divide-y divide-[#eee] text-sm">
            {today.slice(0, 10).map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span><b>{salonTime(a.starts_at)}</b> {a.first_name} · <span className="text-neutral-500">{a.service}</span></span>
                <span className="text-xs text-neutral-500">{a.staff}</span>
              </li>
            ))}
            {today.length === 0 && <li className="py-2 text-neutral-400">Aucun rendez-vous.</li>}
          </ul>
        </Card>
        <Card title="Dernières ventes" className="lg:col-span-2" actions={<Link href="/gestion/caisse" className="text-xs underline">Caisse</Link>}>
          <Table head={['Heure', 'Vente', 'Barber', 'Paiement', 'Montant']} empty={recent.length === 0 && 'Aucune vente.'}>
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-2 text-neutral-500">{salonDate(r.created_at).slice(5)} {salonTime(r.created_at)}</td>
                <td className="px-2 py-2">{r.label} {r.kind === 'PRODUCT' && <Badge>produit</Badge>}</td>
                <td className="px-2 py-2">{r.staff}</td>
                <td className="px-2 py-2"><Badge>{r.payment_method === 'CASH' ? 'espèces' : r.payment_method === 'CARD' ? 'carte' : 'autre'}</Badge></td>
                <td className="px-2 py-2 text-right">{euros(r.amount_cents)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {(lowStock.length > 0 || (isOwner && (pending?.n ?? 0) > 0)) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {lowStock.length > 0 && (
            <Card title="Stock bas"><p className="text-sm">{lowStock.map((p) => `${p.name} (${p.stock_qty})`).join(', ')} — <Link className="underline" href="/gestion/produits">réapprovisionner</Link></p></Card>
          )}
          {isOwner && (pending?.n ?? 0) > 0 && (
            <Card title="À valider"><p className="text-sm">{pending!.n} dépense(s) en attente — <Link className="underline" href="/gestion/depenses">voir</Link></p></Card>
          )}
        </div>
      )}
    </>
  );
}
