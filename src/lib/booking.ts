// Booking service: loads a day from the DB, runs the pure slot engine, and
// writes appointments. Spec: specs/002-online-booking.md
import 'server-only';
import type { PoolClient } from 'pg';
import { SALON } from '@/config/salon';
import { query, queryOne, tx } from '@/lib/db';
import { computeSlots, pickBarber, type Interval } from '@/domain/slots';
import { salonDate, salonTime, salonToUtc, weekdayOf, addDays, isIsoDate } from '@/lib/timezone';
import { normalizePhone } from '@/lib/format';
import { checkPromo, normalizeCode, resolveAttribution } from '@/domain/ambassadors';

export type Locale = 'fr' | 'es' | 'nl' | 'en';

export type ServiceRow = {
  id: string; slug: string; category: string; name: string; note_fr: string | null;
  duration_min: number; price_cents: number; allowed_days: number[] | null; online: boolean;
};

export async function listServices(locale: Locale, opts: { onlineOnly?: boolean } = {}): Promise<ServiceRow[]> {
  const col = { fr: 'name_fr', es: 'name_es', nl: 'name_nl', en: 'name_en' }[locale] ?? 'name_fr';
  return query<ServiceRow>(
    `SELECT id, slug, category, COALESCE(${col}, name_fr) AS name, note_fr, duration_min, price_cents, allowed_days, online
       FROM services WHERE active ${opts.onlineOnly ? 'AND online' : ''} ORDER BY sort, name_fr`,
  );
}

export type BarberRow = { id: string; display_name: string; instagram: string | null; photo_url: string | null; bio: string | null };

export async function listBookableBarbers(): Promise<BarberRow[]> {
  return query<BarberRow>(
    `SELECT id, display_name, instagram, photo_url, bio FROM staff WHERE active AND bookable ORDER BY sort, display_name`,
  );
}

export class BookingError extends Error {
  constructor(public code: 'INVALID' | 'NOT_FOUND' | 'SLOT_TAKEN' | 'CLOSED' | 'TOO_LATE' | 'PROMO_INVALID', message?: string) {
    super(message ?? code);
  }
}

async function openingFor(date: string): Promise<Interval | null> {
  const row = await queryOne<{ opens: string | null; closes: string | null }>(
    'SELECT to_char(opens, \'HH24:MI\') AS opens, to_char(closes, \'HH24:MI\') AS closes FROM opening_hours WHERE weekday = $1',
    [weekdayOf(date)],
  );
  const h = row ?? SALON.openingHours[weekdayOf(date)];
  if (!h?.opens || !h?.closes) return null;
  return { start: salonToUtc(date, h.opens).getTime(), end: salonToUtc(date, h.closes).getTime() };
}

type DayContext = {
  open: Interval | null;
  salonClosed: Interval[];
  busyByStaff: Record<string, Interval[]>;
  loadByStaff: Record<string, number>;
};

async function loadDay(date: string, staffIds: string[], ignoreAppointmentId?: string): Promise<DayContext> {
  const open = await openingFor(date);
  const dayStart = salonToUtc(date, '00:00');
  const dayEnd = salonToUtc(addDays(date, 1), '00:00');
  const appts = await query<{ staff_id: string; starts_at: Date; ends_at: Date }>(
    `SELECT staff_id, starts_at, ends_at FROM appointments
      WHERE status IN ('BOOKED','COMPLETED') AND starts_at < $2 AND ends_at > $1
        AND staff_id = ANY($3::uuid[]) AND ($4::uuid IS NULL OR id <> $4::uuid)`,
    [dayStart, dayEnd, staffIds, ignoreAppointmentId ?? null],
  );
  const offs = await query<{ staff_id: string | null; starts_at: Date; ends_at: Date }>(
    `SELECT staff_id, starts_at, ends_at FROM time_off WHERE starts_at < $2 AND ends_at > $1`,
    [dayStart, dayEnd],
  );
  const busyByStaff: Record<string, Interval[]> = Object.fromEntries(staffIds.map((id) => [id, []]));
  const loadByStaff: Record<string, number> = {};
  for (const a of appts) {
    busyByStaff[a.staff_id]?.push({ start: a.starts_at.getTime(), end: a.ends_at.getTime() });
    loadByStaff[a.staff_id] = (loadByStaff[a.staff_id] ?? 0) + 1;
  }
  const salonClosed: Interval[] = [];
  for (const o of offs) {
    const i = { start: o.starts_at.getTime(), end: o.ends_at.getTime() };
    if (o.staff_id === null) salonClosed.push(i);
    else busyByStaff[o.staff_id]?.push(i);
  }
  return { open, salonClosed, busyByStaff, loadByStaff };
}

export type AvailableSlot = { time: string; staffIds: string[] };

export async function getAvailability(params: {
  date: string; serviceId: string; staffId: string | 'any'; ignoreLeadTime?: boolean; ignoreAppointmentId?: string;
}): Promise<{ slots: AvailableSlot[]; service: ServiceRow }> {
  if (!isIsoDate(params.date)) throw new BookingError('INVALID', 'date');
  const service = await queryOne<ServiceRow>(
    'SELECT id, slug, category, name_fr AS name, note_fr, duration_min, price_cents, allowed_days, online FROM services WHERE id = $1 AND active',
    [params.serviceId],
  );
  if (!service) throw new BookingError('NOT_FOUND', 'service');

  const today = salonDate(new Date());
  if (!params.ignoreLeadTime && (params.date < today || params.date > addDays(today, SALON.booking.maxDaysAhead))) {
    return { slots: [], service };
  }
  if (service.allowed_days && !service.allowed_days.includes(weekdayOf(params.date))) return { slots: [], service };

  const barbers = await listBookableBarbers();
  const staffIds = params.staffId === 'any' ? barbers.map((b) => b.id) : barbers.filter((b) => b.id === params.staffId).map((b) => b.id);
  if (!staffIds.length) throw new BookingError('NOT_FOUND', 'barber');

  const day = await loadDay(params.date, staffIds, params.ignoreAppointmentId);
  const slots = computeSlots({
    open: day.open,
    durationMin: service.duration_min,
    stepMin: SALON.booking.slotStepMin,
    notBefore: params.ignoreLeadTime ? 0 : Date.now() + SALON.booking.minLeadMin * 60_000,
    salonClosed: day.salonClosed,
    barbers: staffIds.map((id) => ({ staffId: id, busy: day.busyByStaff[id] ?? [] })),
  });
  return { slots: slots.map((s) => ({ time: salonTime(new Date(s.start)), staffIds: s.staffIds })), service };
}

export type BookingInput = {
  serviceId: string;
  staffId: string | 'any';
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  locale: Locale;
  source: 'ONLINE' | 'PHONE' | 'WALK_IN';
  createdBy?: string | null;
  /** Staff can book in the past / inside the lead time (walk-ins). */
  ignoreLeadTime?: boolean;
  priceCents?: number;
  /** Ambassador program (spec 010): personal link slug and/or promo code typed by the client. */
  referral?: { slug?: string | null; code?: string | null };
};

async function upsertClient(c: PoolClient, input: { firstName: string; lastName: string; phone: string; email?: string | null }) {
  const res = await c.query<{ id: string }>(
    `INSERT INTO clients (first_name, last_name, phone, email) VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE clients.last_name END,
       email = COALESCE(EXCLUDED.email, clients.email)
     RETURNING id`,
    [input.firstName, input.lastName, input.phone, input.email || null],
  );
  return res.rows[0].id;
}

/** Resolves link + code (spec 010). Unknown slug: ignored. Invalid code: refused (client sees why). */
async function resolveReferral(c: PoolClient, ref: { slug?: string | null; code?: string | null }, clientId: string, phone: string) {
  const slug = typeof ref.slug === 'string' ? ref.slug.trim().toLowerCase().slice(0, 60) : '';
  const link = slug
    ? (await c.query<{ id: string; phone: string }>('SELECT id, phone FROM ambassadors WHERE lower(slug) = $1 AND active', [slug])).rows[0] ?? null
    : null;
  let code: { id: string; ambassadorId: string; phone: string } | null = null;
  if (ref.code) {
    const norm = normalizeCode(ref.code);
    if (!norm) throw new BookingError('PROMO_INVALID');
    const p = (await c.query<{ id: string; ambassador_id: string; percent: number; max_uses: number | null; uses: number; per_client_limit: number;
      valid_until: string | null; active: boolean; amb_active: boolean; amb_phone: string }>(
      `SELECT p.id, p.ambassador_id, p.percent, p.max_uses, p.uses, p.per_client_limit, to_char(p.valid_until,'YYYY-MM-DD') AS valid_until,
              p.active, a.active AS amb_active, a.phone AS amb_phone
         FROM promo_codes p JOIN ambassadors a ON a.id = p.ambassador_id WHERE upper(p.code) = $1`, [norm])).rows[0];
    if (!p) throw new BookingError('PROMO_INVALID');
    const used = (await c.query<{ n: number }>('SELECT count(*)::int AS n FROM promo_redemptions WHERE promo_code_id = $1 AND client_id = $2', [p.id, clientId])).rows[0].n;
    const check = checkPromo({ id: p.id, ambassadorId: p.ambassador_id, percent: p.percent, maxUses: p.max_uses, uses: p.uses, perClientLimit: p.per_client_limit,
      validUntil: p.valid_until, active: p.active, ambassadorActive: p.amb_active }, { today: salonDate(new Date()), clientUses: used });
    if (!check.ok) throw new BookingError('PROMO_INVALID', check.reason);
    code = { id: p.id, ambassadorId: p.ambassador_id, phone: p.amb_phone };
  }
  const r = resolveAttribution(link?.id ?? null, code);
  if (!r) return null;
  // A creator booking for herself is never an acquisition, and is not attributed.
  const creatorPhone = r.ambassadorId === link?.id ? link?.phone : code?.phone;
  if (creatorPhone === phone) return null;
  const past = await c.query<{ n: number }>(
    `SELECT (SELECT count(*) FROM sales WHERE client_id = $1 AND voided_at IS NULL)
          + (SELECT count(*) FROM appointments WHERE client_id = $1 AND status = 'COMPLETED') AS n`, [clientId]);
  return { ...r, isNewClient: Number(past.rows[0].n) === 0 };
}

export type CreatedBooking = {
  id: string; manageToken: string; staffId: string; staffName: string; serviceName: string;
  startsAt: Date; endsAt: Date; priceCents: number;
};

export async function createBooking(input: BookingInput): Promise<CreatedBooking> {
  const firstName = input.firstName?.trim().slice(0, 60);
  const lastName = (input.lastName ?? '').trim().slice(0, 60);
  const phone = normalizePhone(input.phone);
  const email = input.email?.trim().slice(0, 120) || null;
  if (!firstName || !phone || !/^\d{2}:\d{2}$/.test(input.time)) throw new BookingError('INVALID');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError('INVALID', 'email');

  const { slots, service } = await getAvailability({
    date: input.date, serviceId: input.serviceId, staffId: input.staffId, ignoreLeadTime: input.ignoreLeadTime,
  });
  if (input.source === 'ONLINE' && !service.online) throw new BookingError('NOT_FOUND', 'service');
  const slot = slots.find((s) => s.time === input.time);
  if (!slot) throw new BookingError('SLOT_TAKEN');

  let staffId = input.staffId;
  if (staffId === 'any') {
    const day = await loadDay(input.date, slot.staffIds);
    staffId = pickBarber(slot.staffIds, day.loadByStaff) ?? slot.staffIds[0];
  }

  const startsAt = salonToUtc(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
  const priceCents = input.priceCents ?? service.price_cents;

  try {
    return await tx(async (c) => {
      const clientId = await upsertClient(c, { firstName, lastName, phone, email });
      const attribution = input.referral ? await resolveReferral(c, input.referral, clientId, phone) : null;
      const res = await c.query<{ id: string; manage_token: string }>(
        `INSERT INTO appointments (client_id, staff_id, service_id, starts_at, ends_at, source, price_cents, notes, locale, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, manage_token`,
        [clientId, staffId, service.id, startsAt, endsAt, input.source, priceCents,
         input.notes?.trim().slice(0, 500) || null, input.locale, input.createdBy ?? null],
      );
      if (attribution) {
        await c.query(
          `INSERT INTO booking_attributions (appointment_id, ambassador_id, promo_code_id, via, has_conflict, is_new_client)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [res.rows[0].id, attribution.ambassadorId, attribution.promoCodeId, attribution.via, attribution.hasConflict, attribution.isNewClient]);
      }
      const staff = await c.query<{ display_name: string }>('SELECT display_name FROM staff WHERE id = $1', [staffId]);
      return {
        id: res.rows[0].id, manageToken: res.rows[0].manage_token, staffId: staffId as string,
        staffName: staff.rows[0]?.display_name ?? '', serviceName: service.name, startsAt, endsAt, priceCents,
      };
    });
  } catch (e) {
    // 23P01 = exclusion violation: someone took this barber's slot a moment ago.
    if ((e as { code?: string }).code === '23P01') throw new BookingError('SLOT_TAKEN');
    throw e;
  }
}

export type ManagedBooking = {
  id: string; status: string; starts_at: Date; ends_at: Date; price_cents: number; locale: string;
  service_name: string; staff_name: string; first_name: string; manage_token: string;
};

export async function findByToken(token: string): Promise<ManagedBooking | null> {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  return queryOne<ManagedBooking>(
    `SELECT a.id, a.status, a.starts_at, a.ends_at, a.price_cents, a.locale, a.manage_token,
            s.name_fr AS service_name, st.display_name AS staff_name, c.first_name
       FROM appointments a JOIN services s ON s.id = a.service_id JOIN staff st ON st.id = a.staff_id
       JOIN clients c ON c.id = a.client_id WHERE a.manage_token = $1`,
    [token],
  );
}

export async function cancelByToken(token: string): Promise<'OK' | 'NOT_FOUND' | 'TOO_LATE'> {
  const b = await findByToken(token);
  if (!b || b.status !== 'BOOKED') return 'NOT_FOUND';
  if (b.starts_at.getTime() - Date.now() < SALON.booking.cancelUntilMin * 60_000) return 'TOO_LATE';
  await query(`UPDATE appointments SET status = 'CANCELLED', cancelled_at = now() WHERE id = $1 AND status = 'BOOKED'`, [b.id]);
  return 'OK';
}
