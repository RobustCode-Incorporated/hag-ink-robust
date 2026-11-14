import Link from 'next/link';
import { Card, Field, Flash, PageHeader, Badge, input, btn, btnGhost, btnDanger } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { getOpeningHours } from '@/lib/hours';
import { addDays, isIsoDate, salonDate, salonTime, salonToUtc, weekdayOf } from '@/lib/timezone';
import { createAppointmentAction, setAppointmentStatusAction } from '../../actions';
import { SALON } from '@/config/salon';

export const metadata = { title: 'Agenda' };

const PX_PER_MIN = 1.6;
const STATUS: Record<string, { label: string; cls: string }> = {
  BOOKED: { label: 'Réservé', cls: 'bg-black text-white' },
  COMPLETED: { label: 'Encaissé', cls: 'bg-ok text-white' },
  NO_SHOW: { label: 'Absent', cls: 'bg-danger/80 text-white' },
  CANCELLED: { label: 'Annulé', cls: 'bg-neutral-200 text-neutral-500 line-through' },
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; msg?: string; error?: string }> }) {
  const user = await requireRole();
  const sp = await searchParams;
  const date = isIsoDate(sp.date) ? sp.date : salonDate(new Date());
  const isManager = user.role !== 'BARBER';
  const hours = (await getOpeningHours())[weekdayOf(date)];
  const openMin = hours ? Number(hours.opens.slice(0, 2)) * 60 + Number(hours.opens.slice(3)) : 9 * 60;
  const closeMin = hours ? Number(hours.closes.slice(0, 2)) * 60 + Number(hours.closes.slice(3)) : 20 * 60;
  const dayStart = salonToUtc(date, '00:00');
  const dayEnd = salonToUtc(addDays(date, 1), '00:00');

  const [barbers, appts, services, offs] = await Promise.all([
    query<{ id: string; display_name: string }>(
      `SELECT id, display_name FROM staff WHERE active AND ${isManager ? 'bookable AND $1::uuid IS NOT NULL' : 'id = $1'} ORDER BY sort, display_name`, [user.id]),
    query<{ id: string; staff_id: string; starts_at: Date; ends_at: Date; status: string; source: string; price_cents: number; notes: string | null;
            service: string; first_name: string; last_name: string; phone: string }>(
      `SELECT a.id, a.staff_id, a.starts_at, a.ends_at, a.status, a.source, a.price_cents, a.notes, sv.name_fr AS service, c.first_name, c.last_name, c.phone
         FROM appointments a JOIN services sv ON sv.id = a.service_id JOIN clients c ON c.id = a.client_id
        WHERE a.starts_at >= $1 AND a.starts_at < $2 ${isManager ? '' : 'AND a.staff_id = $3'} ORDER BY a.starts_at`,
      isManager ? [dayStart, dayEnd] : [dayStart, dayEnd, user.id]),
    query<{ id: string; name_fr: string; duration_min: number; price_cents: number }>('SELECT id, name_fr, duration_min, price_cents FROM services WHERE active ORDER BY sort'),
    query<{ staff_id: string | null; starts_at: Date; ends_at: Date; reason: string | null }>(
      'SELECT staff_id, starts_at, ends_at, reason FROM time_off WHERE starts_at < $2 AND ends_at > $1', [dayStart, dayEnd]),
  ]);

  const toMin = (d: Date) => { const t = salonTime(d); return Number(t.slice(0, 2)) * 60 + Number(t.slice(3)); };
  const clampMin = (d: Date) => Math.min(Math.max(d < dayStart ? 0 : d >= dayEnd ? 24 * 60 : toMin(d), openMin), closeMin);
  const hoursMarks = Array.from({ length: Math.ceil((closeMin - openMin) / 60) + 1 }, (_, i) => openMin + i * 60).filter((m) => m <= closeMin);
  const live = appts.filter((a) => a.status !== 'CANCELLED');
  const ret = `/gestion/agenda?date=${date}`;
  const fmt = new Intl.DateTimeFormat(SALON.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

  return (
    <>
      <PageHeader title="Agenda" subtitle={`${fmt} · ${live.length} rendez-vous${hours ? ` · ${hours.opens}–${hours.closes}` : ' · salon fermé'}`}
        actions={<>
          <Link className={btnGhost} href={`/gestion/agenda?date=${addDays(date, -1)}`}>← Veille</Link>
          <Link className={btnGhost} href="/gestion/agenda">Aujourd&apos;hui</Link>
          <Link className={btnGhost} href={`/gestion/agenda?date=${addDays(date, 1)}`}>Lendemain →</Link>
          <form className="flex gap-2"><input type="date" name="date" defaultValue={date} className={`${input} py-1`} /><button className={btnGhost}>Aller</button></form>
        </>} />
      <Flash msg={sp.msg} error={sp.error} />

      <Card className="overflow-x-auto p-0">
        <div className="flex min-w-max">
          <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-rem-line bg-white pt-10">
            <div className="relative" style={{ height: (closeMin - openMin) * PX_PER_MIN }}>
              {hoursMarks.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-neutral-400" style={{ top: (m - openMin) * PX_PER_MIN }}>
                  {String(Math.floor(m / 60)).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>
          {barbers.map((b) => (
            <div key={b.id} className="w-44 shrink-0 border-r border-rem-line last:border-r-0">
              <div className="flex h-10 items-center justify-center border-b border-rem-line bg-black px-2 text-xs uppercase tracking-wider text-white">{b.display_name}</div>
              <div className="relative" style={{ height: (closeMin - openMin) * PX_PER_MIN }}>
                {hoursMarks.map((m) => <div key={m} className="absolute inset-x-0 border-t border-[#f0f0f0]" style={{ top: (m - openMin) * PX_PER_MIN }} />)}
                {offs.filter((o) => o.staff_id === null || o.staff_id === b.id).map((o, i) => {
                  const top = clampMin(o.starts_at), bottom = clampMin(o.ends_at);
                  return bottom > top ? (
                    <div key={i} className="absolute inset-x-0 bg-[repeating-linear-gradient(45deg,#f3f3f3,#f3f3f3_6px,#e9e9e9_6px,#e9e9e9_12px)] px-1 text-[10px] text-neutral-500"
                      style={{ top: (top - openMin) * PX_PER_MIN, height: (bottom - top) * PX_PER_MIN }}>{o.reason ?? 'Indisponible'}</div>
                  ) : null;
                })}
                {appts.filter((a) => a.staff_id === b.id && a.status !== 'CANCELLED').map((a) => {
                  const top = toMin(a.starts_at) - openMin;
                  const h = (a.ends_at.getTime() - a.starts_at.getTime()) / 60000;
                  return (
                    <a key={a.id} href={`#rdv-${a.id}`} className={`absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight shadow-sm hover:ring-2 hover:ring-neutral-400 ${STATUS[a.status].cls}`}
                      style={{ top: top * PX_PER_MIN, height: Math.max(h * PX_PER_MIN - 2, 18) }}>
                      <b>{salonTime(a.starts_at)}</b> {a.first_name} · {a.service}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className={`mt-6 grid gap-6 ${isManager ? 'lg:grid-cols-3' : ''}`}>
        <Card title="Rendez-vous du jour" className={isManager ? 'lg:col-span-2' : ''}>
          <ul className="divide-y divide-[#eee]">
            {appts.map((a) => (
              <li key={a.id} id={`rdv-${a.id}`} className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 py-3 target:bg-amber-50">
                <div className="text-sm">
                  <p><b>{salonTime(a.starts_at)}–{salonTime(a.ends_at)}</b> · {a.service} · {euros(a.price_cents)} <Badge tone={a.status === 'COMPLETED' ? 'ok' : a.status === 'BOOKED' ? 'dark' : 'danger'}>{STATUS[a.status].label}</Badge> {a.source !== 'ONLINE' && <Badge>{a.source === 'PHONE' ? 'téléphone' : 'sans RDV'}</Badge>}</p>
                  <p className="text-neutral-600">{a.first_name} {a.last_name} · <a className="underline" href={`tel:${a.phone}`}>{a.phone}</a> · {barbers.find((b) => b.id === a.staff_id)?.display_name}</p>
                  {a.notes && <p className="text-xs text-neutral-500">« {a.notes} »</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === 'BOOKED' && isManager && <Link className={btn} href={`/gestion/caisse?appointment=${a.id}`}>Encaisser</Link>}
                  {a.status === 'BOOKED' && (
                    <>
                      <form action={setAppointmentStatusAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="NO_SHOW" /><input type="hidden" name="return" value={ret} /><button className={btnGhost}>Absent</button></form>
                      <form action={setAppointmentStatusAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="CANCELLED" /><input type="hidden" name="return" value={ret} /><button className={btnDanger}>Annuler</button></form>
                    </>
                  )}
                  {(a.status === 'CANCELLED' || a.status === 'NO_SHOW') && (
                    <form action={setAppointmentStatusAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="BOOKED" /><input type="hidden" name="return" value={ret} /><button className={btnGhost}>Rétablir</button></form>
                  )}
                </div>
              </li>
            ))}
            {appts.length === 0 && <li className="py-4 text-sm text-neutral-400">Aucun rendez-vous ce jour.</li>}
          </ul>
        </Card>

        {isManager && (
          <Card title="Ajouter un rendez-vous">
            <form action={createAppointmentAction} className="space-y-3">
              <input type="hidden" name="date" value={date} />
              <Field label="Prestation">
                <select name="serviceId" required className={input}>{services.map((s) => <option key={s.id} value={s.id}>{s.name_fr} · {s.duration_min} min · {euros(s.price_cents)}</option>)}</select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Barber">
                  <select name="staffId" className={input}><option value="any">Premier libre</option>{barbers.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}</select>
                </Field>
                <Field label="Heure"><input type="time" name="time" required step={300} className={input} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom"><input name="firstName" required className={input} /></Field>
                <Field label="Nom"><input name="lastName" className={input} /></Field>
              </div>
              <Field label="Téléphone"><input name="phone" type="tel" required className={input} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Origine">
                  <select name="source" className={input}><option value="PHONE">Téléphone</option><option value="WALK_IN">Sans rendez-vous</option></select>
                </Field>
                <Field label="Prix (optionnel)"><input name="price" inputMode="decimal" placeholder="catalogue" className={input} /></Field>
              </div>
              <Field label="Note"><input name="notes" className={input} /></Field>
              <button className={`${btn} w-full`}>Ajouter</button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
