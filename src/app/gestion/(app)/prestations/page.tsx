import { Card, Field, Flash, PageHeader, Table, Badge, input, btn } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { saveServiceAction } from '../../actions';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Prestations' };
type S = { id: string; name_fr: string; name_es: string | null; name_nl: string | null; name_en: string | null; category: string; duration_min: number; price_cents: number; allowed_days: number[] | null; online: boolean; active: boolean; sort: number };
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function ServiceForm({ s }: { s?: S }) {
  return (
    <form action={saveServiceAction} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <Field label="Nom (FR)"><input name="nameFr" required defaultValue={s?.name_fr} className={input} /></Field>
      <Field label="Nom (ES)"><input name="nameEs" defaultValue={s?.name_es ?? ''} className={input} /></Field>
      <Field label="Nom (NL)"><input name="nameNl" defaultValue={s?.name_nl ?? ''} className={input} /></Field>
      <Field label="Nom (EN)"><input name="nameEn" defaultValue={s?.name_en ?? ''} className={input} /></Field>
      <Field label="Catégorie"><select name="category" defaultValue={s?.category ?? 'HOMME'} className={input}><option value="HOMME">Homme</option><option value="ETUDIANT">Étudiant</option></select></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Durée (min)"><input name="duration" type="number" min={5} max={480} step={5} required defaultValue={s?.duration_min ?? 30} className={input} /></Field>
        <Field label={`Prix ${SALON.currencySymbol}`}><input name="price" required inputMode="decimal" defaultValue={s ? s.price_cents / 100 : ''} className={input} /></Field>
      </div>
      <Field label="Jours autorisés (aucun = tous)">
        <div className="flex flex-wrap gap-2 pt-1">{DAYS.map((d, i) => (
          <label key={d} className="flex items-center gap-1 text-xs"><input type="checkbox" name="days" value={i} defaultChecked={s?.allowed_days?.includes(i) ?? false} />{d}</label>
        ))}</div>
      </Field>
      <Field label="Ordre"><input name="sort" type="number" defaultValue={s?.sort ?? 99} className={input} /></Field>
      <div className="flex items-center gap-4 text-sm sm:col-span-3">
        <label className="flex items-center gap-2"><input type="checkbox" name="online" defaultChecked={s?.online ?? true} /> Réservable en ligne</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> Active</label>
      </div>
      <button className={btn}>{s ? 'Enregistrer' : 'Ajouter'}</button>
    </form>
  );
}

export default async function PrestationsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireRole('OWNER');
  const sp = await searchParams;
  const services = await query<S>('SELECT * FROM services ORDER BY active DESC, sort, name_fr');
  return (
    <>
      <PageHeader title="Prestations" subtitle="Catalogue et prix : toute modification apparaît immédiatement sur le site public (4 langues)." />
      <Flash msg={sp.msg} error={sp.error} />
      <Card>
        <Table head={['Prestation', 'Durée', 'Prix', 'Jours', 'Statut']}>
          {services.map((s) => (
            <tr key={s.id} className={s.active ? '' : 'text-neutral-400'}>
              <td className="px-2 py-2">{s.name_fr}<span className="block text-xs text-neutral-400">{[s.name_es, s.name_nl, s.name_en].filter(Boolean).join(' · ')}</span></td>
              <td className="px-2 py-2">{s.duration_min} min</td>
              <td className="px-2 py-2">{euros(s.price_cents)}</td>
              <td className="px-2 py-2 text-xs">{s.allowed_days ? s.allowed_days.map((d) => DAYS[d]).join(', ') : 'Tous'}</td>
              <td className="px-2 py-2">{!s.active ? <Badge tone="danger">inactive</Badge> : s.online ? <Badge tone="ok">en ligne</Badge> : <Badge>salon seulement</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Ajouter une prestation" className="mt-6"><ServiceForm /></Card>
      <Card title="Modifier" className="mt-6">
        <div className="space-y-2">{services.map((s) => (
          <details key={s.id} className="rounded-lg border border-rem-line p-3"><summary className="cursor-pointer text-sm">{s.name_fr} · {euros(s.price_cents)}</summary><div className="mt-3"><ServiceForm s={s} /></div></details>
        ))}</div>
      </Card>
    </>
  );
}
