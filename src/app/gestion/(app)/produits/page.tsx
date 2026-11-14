import { Card, Field, Flash, PageHeader, Table, Badge, input, btn, btnGhost } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { restockAction, saveProductAction } from '../../actions';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Produits' };
type P = { id: string; name: string; sku: string | null; purchase_cents: number; price_cents: number; stock_qty: number; low_stock_threshold: number; active: boolean; sold30: number };

function ProductForm({ p }: { p?: P }) {
  return (
    <form action={saveProductAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <Field label="Nom"><input name="name" required defaultValue={p?.name} className={input} /></Field>
      <Field label="Référence (SKU)"><input name="sku" defaultValue={p?.sku ?? ''} className={input} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Prix achat ${SALON.currencySymbol}`}><input name="purchase" inputMode="decimal" defaultValue={p ? p.purchase_cents / 100 : ''} className={input} /></Field>
        <Field label={`Prix vente ${SALON.currencySymbol}`}><input name="price" required inputMode="decimal" defaultValue={p ? p.price_cents / 100 : ''} className={input} /></Field>
      </div>
      <Field label="Alerte stock bas à"><input name="threshold" type="number" min={0} defaultValue={p?.low_stock_threshold ?? 3} className={input} /></Field>
      {!p && <Field label="Stock initial"><input name="stock" type="number" min={0} defaultValue={0} className={input} /></Field>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> En vente</label>
      <button className={btn}>{p ? 'Enregistrer' : 'Ajouter'}</button>
    </form>
  );
}

export default async function ProduitsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireRole('OWNER'); // manager: no access (owner decision 2026-11-14)
  const sp = await searchParams;
  const products = await query<P>(
    `SELECT p.*, (SELECT COALESCE(sum(quantity),0) FROM sales s WHERE s.product_id = p.id AND s.voided_at IS NULL AND s.created_at > now() - interval '30 days')::int AS sold30
       FROM products p ORDER BY p.active DESC, p.name`);
  const stockValue = products.reduce((n, p) => n + p.stock_qty * p.purchase_cents, 0);

  return (
    <>
      <PageHeader title="Produits & stock" subtitle={`Valeur du stock (prix d'achat) : ${euros(stockValue)}. Le stock baisse automatiquement à chaque vente en caisse.`} />
      <Flash msg={sp.msg} error={sp.error} />
      <Card>
        <Table head={['Produit', 'Prix', 'Marge', 'Stock', 'Vendus 30 j', 'Ajuster le stock']} empty={products.length === 0 && 'Aucun produit.'}>
          {products.map((p) => (
            <tr key={p.id} className={p.active ? '' : 'text-neutral-400'}>
              <td className="px-2 py-2">{p.name}{p.sku && <span className="block text-xs text-neutral-400">{p.sku}</span>}</td>
              <td className="px-2 py-2">{euros(p.price_cents)}</td>
              <td className="px-2 py-2">{euros(p.price_cents - p.purchase_cents)}</td>
              <td className="px-2 py-2">{p.stock_qty} {p.stock_qty <= p.low_stock_threshold && <Badge tone="danger">bas</Badge>}</td>
              <td className="px-2 py-2">{p.sold30}</td>
              <td className="px-2 py-2">
                <form action={restockAction} className="flex gap-1"><input type="hidden" name="id" value={p.id} /><input name="quantity" type="number" placeholder="+10 / -2" className={`${input} w-24 py-1`} /><button className={btnGhost}>OK</button></form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Ajouter un produit" className="mt-6"><ProductForm /></Card>
      {products.length > 0 && (
        <Card title="Modifier" className="mt-6">
          <div className="space-y-2">{products.map((p) => (
            <details key={p.id} className="rounded-lg border border-rem-line p-3"><summary className="cursor-pointer text-sm">{p.name}</summary><div className="mt-3"><ProductForm p={p} /></div></details>
          ))}</div>
        </Card>
      )}
    </>
  );
}
