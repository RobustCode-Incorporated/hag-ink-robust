import { Card, Field, Flash, PageHeader, Stat, Table, Badge, input, btn, btnDanger } from '@/components/gestion/ui';
import { requireRole, MANAGERS } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { addDays, salonDate, salonTime, salonToUtc } from '@/lib/timezone';
import { recordSaleAction, voidSaleAction } from '../../actions';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Caisse' };

const PAY = (
  <Field label="Paiement">
    <select name="method" className={input}><option value="CASH">Espèces</option><option value="CARD">Carte</option><option value="OTHER">Autre</option></select>
  </Field>
);

export default async function CaissePage({ searchParams }: { searchParams: Promise<{ appointment?: string; msg?: string; error?: string }> }) {
  await requireRole(...MANAGERS);
  const sp = await searchParams;
  const today = salonDate(new Date());
  const range = [salonToUtc(today, '00:00'), salonToUtc(addDays(today, 1), '00:00')];

  const [open, staff, services, products, sales] = await Promise.all([
    query<{ id: string; starts_at: Date; first_name: string; service: string; staff: string; price_cents: number; promo: string | null }>(
      `SELECT a.id, a.starts_at, c.first_name, sv.name_fr AS service, st.display_name AS staff, a.price_cents,
              (SELECT p.code || ' −' || p.percent || ' %' FROM booking_attributions b JOIN promo_codes p ON p.id = b.promo_code_id WHERE b.appointment_id = a.id) AS promo
         FROM appointments a JOIN clients c ON c.id=a.client_id JOIN services sv ON sv.id=a.service_id JOIN staff st ON st.id=a.staff_id
        WHERE a.status='BOOKED' AND ((a.starts_at >= $1::timestamptz - interval '2 days' AND a.starts_at < $2) OR a.id = $3::uuid) ORDER BY a.starts_at`,
      [...range, /^[0-9a-f-]{36}$/i.test(sp.appointment ?? '') ? sp.appointment : null]),
    query<{ id: string; display_name: string }>('SELECT id, display_name FROM staff WHERE active ORDER BY sort, display_name'),
    query<{ id: string; name_fr: string; price_cents: number }>('SELECT id, name_fr, price_cents FROM services WHERE active ORDER BY sort'),
    query<{ id: string; name: string; price_cents: number; stock_qty: number }>('SELECT id, name, price_cents, stock_qty FROM products WHERE active ORDER BY name'),
    query<{ id: string; created_at: Date; kind: string; label: string; staff: string; amount_cents: number; tip_cents: number; payment_method: string; quantity: number; voided_at: Date | null }>(
      `SELECT s.id, s.created_at, s.kind, COALESCE(sv.name_fr, p.name) AS label, st.display_name AS staff, s.amount_cents, s.tip_cents, s.payment_method, s.quantity, s.voided_at
         FROM sales s JOIN staff st ON st.id=s.staff_id LEFT JOIN services sv ON sv.id=s.service_id LEFT JOIN products p ON p.id=s.product_id
        WHERE s.created_at >= $1 AND s.created_at < $2 ORDER BY s.created_at DESC`, range),
  ]);

  const valid = sales.filter((s) => !s.voided_at);
  const sum = (m?: string) => valid.filter((s) => !m || s.payment_method === m).reduce((n, s) => n + s.amount_cents + s.tip_cents, 0);
  const selected = open.find((a) => a.id === sp.appointment) ?? null;
  // Ambassador allowances usable by this client (spec 010, phase 4). Balance = sum of the ledger.
  const allowances = selected ? await query<{ id: string; label: string; available: number }>(
    `SELECT sa.id, COALESCE(sv.name_fr, 'toute prestation') || COALESCE(' · jusqu’au ' || to_char(sa.valid_until,'YYYY-MM-DD'), '') AS label,
            COALESCE((SELECT sum(qty) FROM allowance_ledger l WHERE l.allowance_id = sa.id), 0)::int AS available
       FROM service_allowances sa JOIN ambassadors am ON am.id = sa.ambassador_id
       JOIN clients cl ON cl.phone = am.phone JOIN appointments ap ON ap.client_id = cl.id AND ap.id = $1
       LEFT JOIN services sv ON sv.id = sa.service_id
      WHERE sa.status = 'APPROVED' AND (sa.service_id IS NULL OR sa.service_id = ap.service_id)
        AND (sa.valid_until IS NULL OR sa.valid_until >= CURRENT_DATE)`, [selected.id]).then((r) => r.filter((a) => a.available > 0)) : [];

  return (
    <>
      <PageHeader title="Caisse" subtitle="Chaque euro encaissé passe par ici : c'est la base des salaires et du tableau de bord." />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total du jour" value={euros(sum())} hint={`${valid.length} ventes, pourboires inclus`} />
        <Stat label="Espèces" value={euros(sum('CASH'))} hint="Doit être dans le tiroir" />
        <Stat label="Carte" value={euros(sum('CARD'))} />
        <Stat label="Autre" value={euros(sum('OTHER'))} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Encaisser un rendez-vous">
          <form action={recordSaleAction} className="space-y-3">
            <input type="hidden" name="kind" value="APPOINTMENT" />
            <Field label="Rendez-vous">
              <select name="appointmentId" required defaultValue={selected?.id ?? ''} className={input}>
                <option value="" disabled>— choisir —</option>
                {open.map((a) => <option key={a.id} value={a.id}>{salonDate(a.starts_at) !== today ? `${salonDate(a.starts_at).slice(5)} ` : ''}{salonTime(a.starts_at)} · {a.first_name} · {a.service} · {a.staff}{a.promo ? ` · code ${a.promo}` : ''}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Montant (${SALON.currencySymbol})`}><input name="amount" required inputMode="decimal" defaultValue={selected ? (selected.price_cents / 100).toString() : ''} className={input} /></Field>
              <Field label={`Pourboire (${SALON.currencySymbol})`}><input name="tip" inputMode="decimal" placeholder="0" className={input} /></Field>
            </div>
            {allowances.length > 0 && (
              <Field label="Prestation offerte (enveloppe ambassadeur)">
                <select name="allowanceId" defaultValue="" className={input}>
                  <option value="">Non, paiement normal</option>
                  {allowances.map((a) => <option key={a.id} value={a.id}>Oui · {a.label} · reste {a.available}</option>)}
                </select>
              </Field>
            )}
            {PAY}
            <button className={`${btn} w-full`}>Encaisser</button>
          </form>
        </Card>

        <Card title="Client sans rendez-vous">
          <form action={recordSaleAction} className="space-y-3">
            <input type="hidden" name="kind" value="SERVICE" />
            <Field label="Prestation"><select name="serviceId" required className={input}>{services.map((s) => <option key={s.id} value={s.id}>{s.name_fr} · {euros(s.price_cents)}</option>)}</select></Field>
            <Field label="Barber"><select name="staffId" required className={input}>{staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Montant (${SALON.currencySymbol})`}><input name="amount" inputMode="decimal" placeholder="prix catalogue" className={input} /></Field>
              <Field label={`Pourboire (${SALON.currencySymbol})`}><input name="tip" inputMode="decimal" placeholder="0" className={input} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom (option)"><input name="firstName" className={input} /></Field>
              <Field label="Téléphone (option)"><input name="phone" type="tel" className={input} /></Field>
            </div>
            {PAY}
            <button className={`${btn} w-full`}>Encaisser</button>
          </form>
        </Card>

        <Card title="Vente produit">
          <form action={recordSaleAction} className="space-y-3">
            <input type="hidden" name="kind" value="PRODUCT" />
            <Field label="Produit"><select name="productId" required className={input}>{products.map((p) => <option key={p.id} value={p.id} disabled={p.stock_qty <= 0}>{p.name} · {euros(p.price_cents)} · stock {p.stock_qty}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité"><input name="quantity" type="number" min={1} max={50} defaultValue={1} className={input} /></Field>
              <Field label="Vendu par"><select name="staffId" required className={input}>{staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select></Field>
            </div>
            {PAY}
            <button className={`${btn} w-full`}>Enregistrer la vente</button>
          </form>
        </Card>
      </div>

      <Card title="Ventes du jour" className="mt-6">
        <Table head={['Heure', 'Vente', 'Barber', 'Paiement', 'Montant', 'Pourboire', '']} empty={sales.length === 0 && 'Aucune vente aujourd’hui.'}>
          {sales.map((s) => (
            <tr key={s.id} className={s.voided_at ? 'text-neutral-400 line-through' : ''}>
              <td className="px-2 py-2">{salonTime(s.created_at)}</td>
              <td className="px-2 py-2">{s.label}{s.quantity > 1 ? ` ×${s.quantity}` : ''} {s.kind === 'PRODUCT' && <Badge>produit</Badge>}</td>
              <td className="px-2 py-2">{s.staff}</td>
              <td className="px-2 py-2">{s.payment_method === 'CASH' ? 'Espèces' : s.payment_method === 'CARD' ? 'Carte' : 'Autre'}</td>
              <td className="px-2 py-2">{euros(s.amount_cents)}</td>
              <td className="px-2 py-2">{s.tip_cents ? euros(s.tip_cents) : '—'}</td>
              <td className="px-2 py-2 text-right">
                {!s.voided_at && <form action={voidSaleAction}><input type="hidden" name="id" value={s.id} /><button className={btnDanger}>Annuler</button></form>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
