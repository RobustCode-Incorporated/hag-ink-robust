import { Card, Field, Flash, PageHeader, Stat, Table, Badge, input, btn, btnGhost, btnDanger } from '@/components/gestion/ui';
import { requireRole, MANAGERS } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { salonDate } from '@/lib/timezone';
import { addExpenseAction, decideExpenseAction } from '../../actions';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Dépenses' };
const CATS: Record<string, string> = { LOYER: 'Loyer', PRODUITS: 'Produits & consommables', MATERIEL: 'Matériel', CHARGES: 'Charges (eau, énergie…)', MARKETING: 'Marketing', AUTRE: 'Autre' };

export default async function DepensesPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const user = await requireRole(...MANAGERS);
  const sp = await searchParams;
  const isOwner = user.role === 'OWNER';
  const month = salonDate(new Date()).slice(0, 7);
  const rows = await query<{ id: string; category: string; description: string; amount_cents: number; spent_on: Date; status: string; author: string | null }>(
    `SELECT e.id, e.category, e.description, e.amount_cents, e.spent_on, e.status, st.display_name AS author
       FROM expenses e LEFT JOIN staff st ON st.id = e.created_by ORDER BY (e.status = 'PENDING') DESC, e.spent_on DESC, e.created_at DESC LIMIT 200`);
  const monthRows = rows.filter((r) => r.status === 'APPROVED' && r.spent_on.toISOString().slice(0, 7) === month);
  const byCat = Object.keys(CATS).map((k) => ({ k, total: monthRows.filter((r) => r.category === k).reduce((n, r) => n + r.amount_cents, 0) })).filter((c) => c.total);

  return (
    <>
      <PageHeader title="Dépenses" subtitle={isOwner ? 'Tes dépenses sont validées directement ; celles des managers attendent ta validation.' : 'Les dépenses sont validées par la direction.'} />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Dépenses validées ce mois" value={euros(monthRows.reduce((n, r) => n + r.amount_cents, 0))} />
        <Stat label="En attente" value={String(rows.filter((r) => r.status === 'PENDING').length)} />
        <Stat label="Plus gros poste" value={byCat.sort((a, b) => b.total - a.total)[0] ? CATS[byCat[0].k] : '—'} hint={byCat[0] ? euros(byCat[0].total) : undefined} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Nouvelle dépense">
          <form action={addExpenseAction} className="space-y-3">
            <Field label="Catégorie"><select name="category" className={input}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Description"><input name="description" required maxLength={200} className={input} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Montant (${SALON.currencySymbol})`}><input name="amount" required inputMode="decimal" className={input} /></Field>
              <Field label="Date"><input name="spentOn" type="date" required defaultValue={salonDate(new Date())} className={input} /></Field>
            </div>
            <button className={`${btn} w-full`}>Enregistrer</button>
          </form>
        </Card>
        <Card title="Historique" className="lg:col-span-2">
          <Table head={['Date', 'Catégorie', 'Description', 'Par', 'Montant', 'Statut', '']} empty={rows.length === 0 && 'Aucune dépense.'}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-2">{r.spent_on.toISOString().slice(0, 10)}</td>
                <td className="px-2 py-2 text-xs">{CATS[r.category] ?? r.category}</td>
                <td className="px-2 py-2">{r.description}</td>
                <td className="px-2 py-2 text-xs text-neutral-500">{r.author ?? '—'}</td>
                <td className="px-2 py-2">{euros(r.amount_cents)}</td>
                <td className="px-2 py-2"><Badge tone={r.status === 'APPROVED' ? 'ok' : r.status === 'PENDING' ? 'warn' : 'danger'}>{r.status === 'APPROVED' ? 'validée' : r.status === 'PENDING' ? 'en attente' : 'refusée'}</Badge></td>
                <td className="px-2 py-2">
                  {isOwner && r.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <form action={decideExpenseAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="APPROVED" /><button className={btnGhost}>Valider</button></form>
                      <form action={decideExpenseAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="REJECTED" /><button className={btnDanger}>Refuser</button></form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
