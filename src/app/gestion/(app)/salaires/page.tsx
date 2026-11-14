import { Card, PageHeader, Stat, Table, input, btnGhost } from '@/components/gestion/ui';
import PrintButton from '@/components/gestion/PrintButton';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { monthRange } from '@/lib/period';
import { salonDate } from '@/lib/timezone';
import { computePayroll } from '@/domain/payroll';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Salaires' };

export default async function SalairesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole('OWNER');
  const m = (await searchParams).month;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : salonDate(new Date()).slice(0, 7);
  const { from, to } = monthRange(month);
  const [staff, sales] = await Promise.all([
    query<{ id: string; display_name: string; pay_type: 'COMMISSION' | 'FIXED'; commission_rate: string; fixed_salary_cents: number }>(
      `SELECT DISTINCT st.id, st.display_name, st.pay_type, st.commission_rate, st.fixed_salary_cents, st.sort FROM staff st
        WHERE st.active OR EXISTS (SELECT 1 FROM sales s WHERE s.staff_id = st.id AND s.created_at >= $1 AND s.created_at < $2) ORDER BY st.sort`, [from, to]),
    query<{ staff_id: string; kind: 'SERVICE' | 'PRODUCT'; amount_cents: number; tip_cents: number }>(
      'SELECT staff_id, kind, amount_cents, tip_cents FROM sales WHERE voided_at IS NULL AND created_at >= $1 AND created_at < $2', [from, to]),
  ]);
  const r = computePayroll(
    staff.map((s) => ({ id: s.id, name: s.display_name, payType: s.pay_type, commissionRate: Number(s.commission_rate), fixedSalaryCents: s.fixed_salary_cents })),
    sales.map((s) => ({ staffId: s.staff_id, kind: s.kind, amountCents: s.amount_cents, tipCents: s.tip_cents })),
  );
  const label = new Intl.DateTimeFormat(SALON.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-15T12:00:00Z`));

  return (
    <div className="printable-report">
      <PageHeader title="Salaires" subtitle={`Rémunérations — ${label}. Commission sur les prestations, pourboires reversés à 100 %.`}
        actions={<>
          <form className="flex gap-2"><input type="month" name="month" defaultValue={month} className={`${input} py-1`} /><button className={btnGhost}>Voir</button></form>
          <PrintButton />
        </>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="CA prestations" value={euros(r.serviceRevenueCents)} />
        <Stat label="Total à verser" value={euros(r.totalDueCents)} hint="Commissions + fixes + pourboires" />
        <Stat label="Part salon (prestations)" value={euros(r.salonShareCents)} tone="ok" hint="Après commissions, avant dépenses" />
      </div>
      <Card className="mt-6">
        <Table head={['Membre', 'Type', 'Prestations', 'CA prestations', 'Ventes produits', 'Commission', 'Fixe', 'Pourboires', 'Total dû']}>
          {r.lines.map((l) => (
            <tr key={l.staffId}>
              <td className="px-2 py-2">{l.name}</td>
              <td className="px-2 py-2 text-xs">{l.payType === 'COMMISSION' ? 'Commission' : 'Fixe'}</td>
              <td className="px-2 py-2">{l.serviceCount}</td>
              <td className="px-2 py-2">{euros(l.serviceRevenueCents)}</td>
              <td className="px-2 py-2">{euros(l.productRevenueCents)}</td>
              <td className="px-2 py-2">{euros(l.commissionCents)}</td>
              <td className="px-2 py-2">{euros(l.fixedCents)}</td>
              <td className="px-2 py-2">{euros(l.tipsCents)}</td>
              <td className="px-2 py-2 font-bold">{euros(l.totalDueCents)}</td>
            </tr>
          ))}
        </Table>
        <p className="mt-4 text-xs text-neutral-500">Montants bruts indicatifs calculés depuis la caisse. Les cotisations sociales et le statut (salarié / indépendant) sont à traiter avec le secrétariat social.</p>
      </Card>
    </div>
  );
}
