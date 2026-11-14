import { Card, Field, Flash, PageHeader, Table, Badge, input, btn, btnDanger } from '@/components/gestion/ui';
import { requireRole, MANAGERS } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { feedToken } from '@/lib/ics';
import { salonDate, salonTime } from '@/lib/timezone';
import { SITE_URL, SALON } from '@/config/salon';
import { addTimeOffAction, deleteTimeOffAction, saveStaffAction } from '../../actions';

export const metadata = { title: 'Équipe' };

type Staff = { id: string; display_name: string; role: string; email: string | null; phone: string | null; instagram: string | null;
  pay_type: string; commission_rate: string; fixed_salary_cents: number; bookable: boolean; active: boolean; sort: number; has_login: boolean };

function StaffForm({ s }: { s?: Staff }) {
  return (
    <form action={saveStaffAction} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <Field label="Nom affiché"><input name="displayName" required defaultValue={s?.display_name} className={input} /></Field>
      <Field label="Rôle">
        <select name="role" defaultValue={s?.role ?? 'BARBER'} className={input}><option value="BARBER">Barber</option><option value="MANAGER">Manager</option><option value="OWNER">Direction</option></select>
      </Field>
      <Field label="Rémunération">
        <select name="payType" defaultValue={s?.pay_type ?? 'COMMISSION'} className={input}><option value="COMMISSION">Commission</option><option value="FIXED">Salaire fixe</option></select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Commission %"><input name="commissionPct" inputMode="decimal" defaultValue={s ? Math.round(Number(s.commission_rate) * 1000) / 10 : 50} className={input} /></Field>
        <Field label={`Fixe ${SALON.currencySymbol}/mois`}><input name="fixedSalary" inputMode="decimal" defaultValue={s ? s.fixed_salary_cents / 100 : 0} className={input} /></Field>
      </div>
      <Field label="Email (connexion)"><input name="email" type="email" defaultValue={s?.email ?? ''} className={input} /></Field>
      <Field label={s?.has_login ? 'Nouveau mot de passe' : 'Mot de passe'}><input name="password" type="password" minLength={10} placeholder={s?.has_login ? 'inchangé' : 'pas de connexion'} autoComplete="new-password" className={input} /></Field>
      <Field label="Téléphone"><input name="phone" defaultValue={s?.phone ?? ''} className={input} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Instagram"><input name="instagram" defaultValue={s?.instagram ?? ''} className={input} /></Field>
        <Field label="Ordre"><input name="sort" type="number" defaultValue={s?.sort ?? 99} className={input} /></Field>
      </div>
      <div className="flex items-center gap-4 text-sm sm:col-span-3">
        <label className="flex items-center gap-2"><input type="checkbox" name="bookable" defaultChecked={s?.bookable ?? true} /> Réservable en ligne</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> Actif</label>
      </div>
      <button className={btn}>{s ? 'Enregistrer' : 'Ajouter'}</button>
    </form>
  );
}

export default async function EquipePage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const user = await requireRole(...MANAGERS);
  const sp = await searchParams;
  const isOwner = user.role === 'OWNER';
  const [staff, offs] = await Promise.all([
    query<Staff>(`SELECT id, display_name, role, email, phone, instagram, pay_type, commission_rate, fixed_salary_cents, bookable, active, sort,
                         password_hash IS NOT NULL AS has_login FROM staff ORDER BY active DESC, sort, display_name`),
    query<{ id: string; staff: string | null; starts_at: Date; ends_at: Date; reason: string | null }>(
      `SELECT t.id, st.display_name AS staff, t.starts_at, t.ends_at, t.reason FROM time_off t LEFT JOIN staff st ON st.id = t.staff_id
        WHERE t.ends_at > now() ORDER BY t.starts_at`),
  ]);
  const roleLabel = { OWNER: 'Direction', MANAGER: 'Manager', BARBER: 'Barber' } as Record<string, string>;

  return (
    <>
      <PageHeader title="Équipe" subtitle="Barbers, accès, rémunération et absences." />
      <Flash msg={sp.msg} error={sp.error} />

      <Card title="Membres">
        <Table head={['Nom', 'Rôle', 'Rémunération', 'Connexion', 'Statut', 'Agenda (iPhone / Google)']}>
          {staff.map((s) => (
            <tr key={s.id} className={s.active ? '' : 'text-neutral-400'}>
              <td className="px-2 py-2">{s.display_name}{s.instagram && <span className="block text-xs text-neutral-400">@{s.instagram}</span>}</td>
              <td className="px-2 py-2"><Badge tone={s.role === 'OWNER' ? 'dark' : 'neutral'}>{roleLabel[s.role]}</Badge></td>
              <td className="px-2 py-2">{s.pay_type === 'COMMISSION' ? `${Math.round(Number(s.commission_rate) * 1000) / 10} % des prestations` : `${euros(s.fixed_salary_cents)} / mois`}</td>
              <td className="px-2 py-2">{s.has_login ? s.email : '—'}</td>
              <td className="px-2 py-2">{s.active ? (s.bookable ? <Badge tone="ok">réservable</Badge> : <Badge>actif</Badge>) : <Badge tone="danger">inactif</Badge>}</td>
              <td className="px-2 py-2">{s.bookable && s.active && (
                <code className="block max-w-[220px] truncate text-[10px] text-neutral-500" title="Copier ce lien dans Calendrier → Ajouter un abonnement">
                  {`${SITE_URL.replace(/^https?/, 'webcal')}/api/calendar/${s.id}?token=${feedToken(s.id)}`}
                </code>
              )}</td>
            </tr>
          ))}
        </Table>
      </Card>

      {isOwner && (
        <>
          <Card title="Ajouter un membre" className="mt-6"><StaffForm /></Card>
          <Card title="Modifier un membre" className="mt-6">
            <div className="space-y-2">
              {staff.map((s) => (
                <details key={s.id} className="rounded-lg border border-rem-line p-3 open:bg-neutral-50">
                  <summary className="cursor-pointer text-sm">{s.display_name} <span className="text-neutral-400">· {roleLabel[s.role]}</span></summary>
                  <div className="mt-3"><StaffForm s={s} /></div>
                </details>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Déclarer une absence / fermeture">
          <form action={addTimeOffAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Qui" className="sm:col-span-2">
              <select name="staffId" className={input}><option value="SALON">Tout le salon (fermeture)</option>{staff.filter((s) => s.active && s.bookable).map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
            </Field>
            <Field label="Du"><input type="date" name="startDate" required className={input} /></Field>
            <Field label="Au (inclus)"><input type="date" name="endDate" className={input} /></Field>
            <Field label="De (heure, option)"><input type="time" name="startTime" className={input} /></Field>
            <Field label="À (heure, option)"><input type="time" name="endTime" className={input} /></Field>
            <Field label="Motif" className="sm:col-span-2"><input name="reason" placeholder="Congé, formation, jour férié…" className={input} /></Field>
            <button className={`${btn} sm:col-span-2`}>Enregistrer</button>
          </form>
        </Card>
        <Card title="Absences à venir">
          <ul className="divide-y divide-[#eee] text-sm">
            {offs.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <span><b>{o.staff ?? 'Salon fermé'}</b> · {salonDate(o.starts_at)} {salonTime(o.starts_at)} → {salonDate(o.ends_at)} {salonTime(o.ends_at)}{o.reason && <span className="text-neutral-500"> · {o.reason}</span>}</span>
                <form action={deleteTimeOffAction}><input type="hidden" name="id" value={o.id} /><button className={btnDanger}>Supprimer</button></form>
              </li>
            ))}
            {offs.length === 0 && <li className="py-2 text-neutral-400">Aucune absence prévue.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
