import { notFound } from 'next/navigation';
import { Badge, Card, PageHeader, Stat, Table } from '@/components/gestion/ui';
import { SALON } from '@/config/salon';
import { findPlan } from '@/domain/memberships';
import { MANAGERS, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';

export const metadata = { title: 'Abonnements' };

// Packs paid online with FlexPay (spec 012). Switched off while SALON.features.memberships is false.
export default async function AbonnementsPage() {
  if (!SALON.features.memberships) notFound();
  await requireRole(...MANAGERS);
  const payments = await query<{ order_number: string; plan_code: string; amount_cents: number; method: string | null; status: string; created_at: Date; client: string; phone: string }>(
    `SELECT p.order_number, p.plan_code, p.amount_cents, p.method, p.status::text, p.created_at,
            trim(c.first_name || ' ' || c.last_name) AS client, c.phone
       FROM membership_payments p JOIN clients c ON c.id = p.client_id ORDER BY p.created_at DESC LIMIT 300`);
  const active = await query<{ plan_code: string; ends_at: Date; client: string; phone: string }>(
    `SELECT DISTINCT ON (m.client_id) m.plan_code, m.ends_at, trim(c.first_name || ' ' || c.last_name) AS client, c.phone
       FROM client_memberships m JOIN clients c ON c.id = m.client_id WHERE m.ends_at > now() ORDER BY m.client_id, m.ends_at DESC`);
  const paid = payments.filter((p) => p.status === 'PAID');
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const tone = (s: string) => (s === 'PAID' ? 'ok' : s === 'FAILED' ? 'danger' : 'warn') as 'ok' | 'danger' | 'warn';

  return (
    <>
      <PageHeader title="Abonnements" subtitle="Packs payés en ligne via FlexPay (Mobile Money ou carte)." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Abonnés actifs" value={String(active.length)} />
        <Stat label="Paiements reçus" value={String(paid.length)} />
        <Stat label="Encaissé (en ligne)" value={euros(paid.reduce((t, p) => t + p.amount_cents, 0))} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Abonnés actifs">
          <Table head={['Client', 'Pack', 'Fin']} empty={active.length === 0 && 'Aucun abonné actif.'}>
            {active.map((a) => (
              <tr key={a.phone}>
                <td className="px-2 py-2">{a.client}<br /><span className="text-xs text-neutral-500">{a.phone}</span></td>
                <td className="px-2 py-2">{findPlan(a.plan_code)?.name ?? a.plan_code}</td>
                <td className="px-2 py-2 text-xs">{day(a.ends_at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Paiements FlexPay" className="lg:col-span-2">
          <Table head={['Date', 'Client', 'Pack', 'Montant', 'Moyen', 'Statut']} empty={payments.length === 0 && 'Aucun paiement.'}>
            {payments.map((p) => (
              <tr key={p.order_number}>
                <td className="px-2 py-2 text-xs">{day(p.created_at)}</td>
                <td className="px-2 py-2">{p.client}<br /><span className="text-xs text-neutral-500">{p.phone}</span></td>
                <td className="px-2 py-2">{findPlan(p.plan_code)?.name ?? p.plan_code}</td>
                <td className="px-2 py-2">{euros(p.amount_cents)}</td>
                <td className="px-2 py-2 text-xs">{p.method === 'CARD' ? 'Carte' : p.method === 'MOBILE_MONEY' ? 'Mobile Money' : '—'}</td>
                <td className="px-2 py-2"><Badge tone={tone(p.status)}>{p.status}</Badge></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
