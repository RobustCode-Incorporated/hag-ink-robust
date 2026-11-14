'use server';
// All management mutations. Each action re-checks the role server-side,
// validates input, writes, logs sensitive changes, then redirects back with a flash.
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { requireRole, MANAGERS } from '@/lib/auth';
import { SALON } from '@/config/salon';
import { audit, query, queryOne, tx } from '@/lib/db';
import { BookingError, createBooking } from '@/lib/booking';
import { euros, normalizePhone, parseEurosToCents } from '@/lib/format';
import { checkPromo, discountCents } from '@/domain/ambassadors';
import { isIsoDate, salonDate, salonToUtc, addDays } from '@/lib/timezone';

const UUID = /^[0-9a-f-]{36}$/i;
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const uuidOrNull = (v: string) => (UUID.test(v) ? v : null);

function back(path: string, params: Record<string, string>): never {
  const url = new URL(path, 'http://x');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  revalidatePath('/gestion', 'layout');
  redirect(`${url.pathname}${url.search}`);
}

/* ---------------- Agenda ---------------- */

export async function createAppointmentAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const date = s(f, 'date');
  const ret = `/gestion/agenda?date=${date}`;
  try {
    const priceRaw = s(f, 'price');
    await createBooking({
      serviceId: s(f, 'serviceId'), staffId: s(f, 'staffId') || 'any', date, time: s(f, 'time'),
      firstName: s(f, 'firstName'), lastName: s(f, 'lastName'), phone: s(f, 'phone'), email: s(f, 'email') || null,
      notes: s(f, 'notes') || null, locale: 'fr', source: s(f, 'source') === 'WALK_IN' ? 'WALK_IN' : 'PHONE',
      createdBy: user.id, ignoreLeadTime: true, priceCents: priceRaw ? parseEurosToCents(priceRaw) ?? undefined : undefined,
    });
  } catch (e) {
    if (e instanceof BookingError) {
      back(ret, { error: e.code === 'SLOT_TAKEN' ? 'Ce barber n’est pas libre à cette heure (ou le salon est fermé).' : 'Informations invalides (prénom + téléphone obligatoires).' });
    }
    throw e;
  }
  back(ret, { msg: 'Rendez-vous ajouté.' });
}

export async function setAppointmentStatusAction(f: FormData) {
  const user = await requireRole('OWNER', 'MANAGER', 'BARBER');
  const id = s(f, 'id');
  const status = s(f, 'status');
  const ret = s(f, 'return') || '/gestion/agenda';
  if (!UUID.test(id) || !['CANCELLED', 'NO_SHOW', 'BOOKED'].includes(status)) back(ret, { error: 'Action invalide.' });
  // A barber can only touch his own appointments.
  const own = user.role === 'BARBER' ? 'AND staff_id = $3' : 'AND $3::uuid IS NOT NULL';
  const rows = await query(
    `UPDATE appointments SET status = $2::appointment_status, cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN now() ELSE NULL END
      WHERE id = $1 AND status <> 'COMPLETED' ${own} RETURNING id`,
    [id, status, user.id],
  ).catch((e) => {
    if ((e as { code?: string }).code === '23P01') return null;
    throw e;
  });
  if (!rows) back(ret, { error: 'Impossible de rétablir : le créneau a été repris.' });
  if (!rows.length) back(ret, { error: 'Rendez-vous introuvable ou déjà encaissé.' });
  await audit(user.id, `appointment.${status.toLowerCase()}`, 'appointment', id);
  back(ret, { msg: status === 'CANCELLED' ? 'Rendez-vous annulé.' : status === 'NO_SHOW' ? 'Marqué absent.' : 'Rendez-vous rétabli.' });
}

export async function addTimeOffAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const ret = '/gestion/equipe';
  const staffId = s(f, 'staffId');
  const d1 = s(f, 'startDate'), d2 = s(f, 'endDate') || d1;
  const t1 = s(f, 'startTime') || '00:00', t2 = s(f, 'endTime') || '23:59';
  if (!isIsoDate(d1) || !isIsoDate(d2)) back(ret, { error: 'Dates invalides.' });
  const start = salonToUtc(d1, t1);
  const end = t2 === '23:59' && !s(f, 'endTime') ? salonToUtc(addDays(d2, 1), '00:00') : salonToUtc(d2, t2);
  if (end <= start) back(ret, { error: 'La fin doit être après le début.' });
  await query('INSERT INTO time_off (staff_id, starts_at, ends_at, reason) VALUES ($1,$2,$3,$4)', [
    staffId === 'SALON' ? null : uuidOrNull(staffId), start, end, s(f, 'reason') || null,
  ]);
  await audit(user.id, 'time_off.create', 'time_off', null, { staffId, d1, d2 });
  back(ret, { msg: 'Absence enregistrée : ces créneaux ne sont plus réservables.' });
}

export async function deleteTimeOffAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const id = s(f, 'id');
  if (UUID.test(id)) await query('DELETE FROM time_off WHERE id = $1', [id]);
  await audit(user.id, 'time_off.delete', 'time_off', id);
  back('/gestion/equipe', { msg: 'Absence supprimée.' });
}

/* ---------------- Caisse ---------------- */

export async function recordSaleAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const ret = '/gestion/caisse';
  const kind = s(f, 'kind');
  const method = ['CASH', 'CARD', 'OTHER'].includes(s(f, 'method')) ? s(f, 'method') : 'CASH';
  const tip = parseEurosToCents(s(f, 'tip') || '0') ?? 0;

  if (kind === 'APPOINTMENT') {
    const id = s(f, 'appointmentId');
    const amount = parseEurosToCents(s(f, 'amount'));
    if (!UUID.test(id) || amount === null) back(ret, { error: 'Choisis un rendez-vous et un montant.' });
    const ok = await tx(async (c) => {
      const a = await c.query<{ staff_id: string; client_id: string; service_id: string }>(
        `UPDATE appointments SET status = 'COMPLETED' WHERE id = $1 AND status = 'BOOKED' RETURNING staff_id, client_id, service_id`, [id]);
      if (!a.rowCount) return '';
      const r = a.rows[0];
      let charged = amount!;
      let note = '';
      // Free service from an ambassador allowance (spec 010, phase 4): the creator only, balance from the ledger.
      const allowanceId = uuidOrNull(s(f, 'allowanceId'));
      if (allowanceId) {
        const al = (await c.query<{ id: string; service_id: string | null; valid_until: string | null }>(
          `SELECT sa.id, sa.service_id, to_char(sa.valid_until,'YYYY-MM-DD') AS valid_until
             FROM service_allowances sa JOIN ambassadors am ON am.id = sa.ambassador_id JOIN clients cl ON cl.phone = am.phone
            WHERE sa.id = $1 AND sa.status = 'APPROVED' AND cl.id = $2 FOR UPDATE OF sa`, [allowanceId, r.client_id])).rows[0];
        if (!al) throw new Error('ALLOWANCE');
        if (al.service_id && al.service_id !== r.service_id) throw new Error('ALLOWANCE');
        if (al.valid_until && salonDate(new Date()) > al.valid_until) throw new Error('ALLOWANCE');
        const { balance } = await ledgerOf(c, allowanceId);
        if (balance.available < 1) throw new Error('ALLOWANCE');
        await c.query(`INSERT INTO allowance_ledger (allowance_id, kind, qty, appointment_id, idempotency_key, reason, created_by)
                       VALUES ($1,'CONSUMPTION',-1,$2,$3,'Prestation réalisée',$4)`, [allowanceId, id, `consume:${id}`, user.id]);
        charged = 0;
        note = ` Prestation offerte (enveloppe ambassadeur), solde restant ${balance.available - 1}.`;
      }
      // Ambassador promo code (spec 010): checked again and applied here, from the DB, under row lock.
      const promo = allowanceId ? undefined : (await c.query<{ id: string; code: string; percent: number; max_uses: number | null; uses: number; per_client_limit: number;
        valid_until: string | null; active: boolean; amb_active: boolean; ambassador_id: string }>(
        `SELECT p.id, p.code, p.percent, p.max_uses, p.uses, p.per_client_limit, to_char(p.valid_until,'YYYY-MM-DD') AS valid_until,
                p.active, am.active AS amb_active, p.ambassador_id
           FROM booking_attributions b JOIN promo_codes p ON p.id = b.promo_code_id JOIN ambassadors am ON am.id = p.ambassador_id
          WHERE b.appointment_id = $1 FOR UPDATE OF p`, [id])).rows[0];
      if (promo) {
        const used = (await c.query<{ n: number }>('SELECT count(*)::int AS n FROM promo_redemptions WHERE promo_code_id = $1 AND client_id = $2', [promo.id, r.client_id])).rows[0].n;
        const check = checkPromo({ id: promo.id, ambassadorId: promo.ambassador_id, percent: promo.percent, maxUses: promo.max_uses, uses: promo.uses,
          perClientLimit: promo.per_client_limit, validUntil: promo.valid_until, active: promo.active, ambassadorActive: promo.amb_active },
          { today: salonDate(new Date()), clientUses: used });
        if (check.ok) {
          const discount = discountCents(charged, promo.percent);
          charged -= discount;
          await c.query('UPDATE promo_codes SET uses = uses + 1 WHERE id = $1', [promo.id]);
          await c.query('INSERT INTO promo_redemptions (promo_code_id, appointment_id, client_id, discount_cents, created_by) VALUES ($1,$2,$3,$4,$5)',
            [promo.id, id, r.client_id, discount, user.id]);
          note = ` Code ${promo.code} : remise de ${euros(discount)}.`;
        } else {
          note = ` Code ${promo.code} non appliqué (${check.reason}).`;
        }
      }
      await c.query(
        `INSERT INTO sales (kind, staff_id, client_id, appointment_id, service_id, amount_cents, tip_cents, payment_method, created_by)
         VALUES ('SERVICE',$1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.staff_id, r.client_id, id, r.service_id, charged, tip, method, user.id]);
      return note || ' ';
    }).catch((e: Error) => (e.message === 'ALLOWANCE' ? 'ALLOWANCE' : Promise.reject(e)));
    if (ok === 'ALLOWANCE') back(ret, { error: 'Enveloppe non utilisable (autre client, autre prestation, expirée ou épuisée).' });
    if (!ok) back(ret, { error: 'Ce rendez-vous est déjà encaissé ou annulé.' });
    back(ret, { msg: `Rendez-vous encaissé.${ok === ' ' ? '' : ok}` });
  }

  const staffId = s(f, 'staffId');
  if (!UUID.test(staffId)) back(ret, { error: 'Choisis le barber.' });
  if (user.role === 'MANAGER') {
    const isBarber = await queryOne('SELECT 1 FROM staff WHERE id = $1 AND active AND role = $2', [staffId, 'BARBER']);
    if (!isBarber) back(ret, { error: 'Choisis un barber.' });
  }

  if (kind === 'SERVICE') {
    const serviceId = s(f, 'serviceId');
    const svc = UUID.test(serviceId) ? await queryOne<{ price_cents: number }>('SELECT price_cents FROM services WHERE id = $1', [serviceId]) : null;
    if (!svc) back(ret, { error: 'Choisis une prestation.' });
    const amount = s(f, 'amount') ? parseEurosToCents(s(f, 'amount')) : svc.price_cents;
    if (amount === null) back(ret, { error: 'Montant invalide.' });
    let clientId: string | null = null;
    const phone = normalizePhone(s(f, 'phone'));
    if (phone) {
      const c = await queryOne<{ id: string }>(
        `INSERT INTO clients (first_name, last_name, phone) VALUES ($1, '', $2)
         ON CONFLICT (phone) DO UPDATE SET first_name = CASE WHEN EXCLUDED.first_name <> 'Client' THEN EXCLUDED.first_name ELSE clients.first_name END
         RETURNING id`, [s(f, 'firstName') || 'Client', phone]);
      clientId = c?.id ?? null;
    }
    await query(
      `INSERT INTO sales (kind, staff_id, client_id, service_id, amount_cents, tip_cents, payment_method, created_by)
       VALUES ('SERVICE',$1,$2,$3,$4,$5,$6,$7)`, [staffId, clientId, serviceId, amount, tip, method, user.id]);
    back(ret, { msg: 'Prestation encaissée.' });
  }

  if (kind === 'PRODUCT') {
    const productId = s(f, 'productId');
    const qty = Math.max(1, Math.min(50, Number(s(f, 'quantity')) || 1));
    const ok = await tx(async (c) => {
      const p = await c.query<{ price_cents: number }>(
        'UPDATE products SET stock_qty = stock_qty - $2 WHERE id = $1 AND active AND stock_qty >= $2 RETURNING price_cents', [productId, qty]);
      if (!p.rowCount) return false;
      await c.query(
        `INSERT INTO sales (kind, staff_id, product_id, quantity, amount_cents, tip_cents, payment_method, created_by)
         VALUES ('PRODUCT',$1,$2,$3,$4,$5,$6,$7)`, [staffId, productId, qty, p.rows[0].price_cents * qty, tip, method, user.id]);
      return true;
    }).catch(() => false);
    if (!ok) back(ret, { error: 'Produit introuvable ou stock insuffisant.' });
    back(ret, { msg: 'Vente produit enregistrée (stock mis à jour).' });
  }
  back(ret, { error: 'Type de vente inconnu.' });
}

export async function voidSaleAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const id = s(f, 'id');
  if (!UUID.test(id)) back('/gestion/caisse', { error: 'Vente invalide.' });
  await tx(async (c) => {
    const r = await c.query<{ kind: string; product_id: string | null; quantity: number; appointment_id: string | null }>(
      'UPDATE sales SET voided_at = now() WHERE id = $1 AND voided_at IS NULL RETURNING kind, product_id, quantity, appointment_id', [id]);
    const sale = r.rows[0];
    if (!sale) return;
    if (sale.kind === 'PRODUCT' && sale.product_id) await c.query('UPDATE products SET stock_qty = stock_qty + $2 WHERE id = $1', [sale.product_id, sale.quantity]);
    if (sale.appointment_id) {
      await c.query('UPDATE sales SET appointment_id = NULL WHERE id = $1', [id]);
      await c.query(`UPDATE appointments SET status = 'BOOKED' WHERE id = $1 AND status = 'COMPLETED'`, [sale.appointment_id]);
    }
  });
  await audit(user.id, 'sale.void', 'sale', id);
  back('/gestion/caisse', { msg: 'Vente annulée.' });
}

/* ---------------- Équipe ---------------- */

export async function saveStaffAction(f: FormData) {
  const user = await requireRole('OWNER');
  const ret = '/gestion/equipe';
  const id = s(f, 'id');
  const name = s(f, 'displayName');
  const role = ['OWNER', 'MANAGER', 'BARBER'].includes(s(f, 'role')) ? s(f, 'role') : 'BARBER';
  const payType = s(f, 'payType') === 'FIXED' ? 'FIXED' : 'COMMISSION';
  const rate = Math.min(Math.max(Number(s(f, 'commissionPct').replace(',', '.')) / 100 || 0, 0), 1);
  const fixed = parseEurosToCents(s(f, 'fixedSalary') || '0') ?? 0;
  const email = s(f, 'email').toLowerCase() || null;
  const password = s(f, 'password');
  if (!name) back(ret, { error: 'Le nom est obligatoire.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(ret, { error: 'Email invalide.' });
  if (password && password.length < 10) back(ret, { error: 'Mot de passe : 10 caractères minimum.' });
  if (id === user.id && role !== 'OWNER') back(ret, { error: 'Tu ne peux pas retirer ton propre rôle Direction.' });
  const hash = password ? await bcrypt.hash(password, 12) : null;
  const params = [name, role, email, s(f, 'phone') || null, s(f, 'instagram').replace(/^@/, '') || null, payType, rate, fixed,
    f.get('bookable') === 'on', f.get('active') === 'on' || id === user.id, Number(s(f, 'sort')) || 0];
  try {
    if (UUID.test(id)) {
      await query(
        `UPDATE staff SET display_name=$1, role=$2, email=$3, phone=$4, instagram=$5, pay_type=$6, commission_rate=$7,
           fixed_salary_cents=$8, bookable=$9, active=$10, sort=$11, password_hash = COALESCE($12, password_hash) WHERE id = $13`,
        [...params, hash, id]);
    } else {
      await query(
        `INSERT INTO staff (display_name, role, email, phone, instagram, pay_type, commission_rate, fixed_salary_cents, bookable, active, sort, password_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [...params, hash]);
    }
  } catch (e) {
    if ((e as { code?: string }).code === '23505') back(ret, { error: 'Cet email est déjà utilisé.' });
    throw e;
  }
  await audit(user.id, UUID.test(id) ? 'staff.update' : 'staff.create', 'staff', id || null, { name, role, payType, rate, fixed, passwordChanged: !!password });
  back(ret, { msg: `${name} enregistré.` });
}

export async function changeOwnPasswordAction(f: FormData) {
  const user = await requireRole();
  const current = s(f, 'current');
  const next = s(f, 'next');
  const row = await queryOne<{ password_hash: string }>('SELECT password_hash FROM staff WHERE id = $1', [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) back('/gestion/moi', { error: 'Mot de passe actuel incorrect.' });
  if (next.length < 10) back('/gestion/moi', { error: 'Nouveau mot de passe : 10 caractères minimum.' });
  await query('UPDATE staff SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 12), user.id]);
  await audit(user.id, 'staff.password', 'staff', user.id);
  back('/gestion/moi', { msg: 'Mot de passe modifié.' });
}

/* ---------------- Dépenses ---------------- */

export async function addExpenseAction(f: FormData) {
  const user = await requireRole(...MANAGERS);
  const amount = parseEurosToCents(s(f, 'amount'));
  const date = s(f, 'spentOn');
  if (!amount || !s(f, 'description') || !isIsoDate(date)) back('/gestion/depenses', { error: 'Montant, description et date obligatoires.' });
  // The owner's own expenses are approved directly.
  const status = user.role === 'OWNER' ? 'APPROVED' : 'PENDING';
  await query(
    `INSERT INTO expenses (category, description, amount_cents, spent_on, status, created_by, decided_by, decided_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [s(f, 'category') || 'AUTRE', s(f, 'description').slice(0, 200), amount, date, status, user.id,
     status === 'APPROVED' ? user.id : null, status === 'APPROVED' ? new Date() : null]);
  back('/gestion/depenses', { msg: status === 'APPROVED' ? 'Dépense enregistrée.' : 'Dépense envoyée pour validation.' });
}

export async function decideExpenseAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const decision = s(f, 'decision') === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  if (UUID.test(id)) {
    await query(`UPDATE expenses SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [id, decision, user.id]);
    await audit(user.id, `expense.${decision.toLowerCase()}`, 'expense', id);
  }
  back('/gestion/depenses', { msg: decision === 'APPROVED' ? 'Dépense validée.' : 'Dépense refusée.' });
}

/* ---------------- Produits ---------------- */

export async function saveProductAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const price = parseEurosToCents(s(f, 'price'));
  const purchase = parseEurosToCents(s(f, 'purchase') || '0') ?? 0;
  if (!s(f, 'name') || price === null) back('/gestion/produits', { error: 'Nom et prix obligatoires.' });
  const params = [s(f, 'name'), s(f, 'sku') || null, purchase, price, Math.max(0, Number(s(f, 'threshold')) || 0), f.get('active') === 'on'];
  try {
    if (UUID.test(id)) {
      await query('UPDATE products SET name=$1, sku=$2, purchase_cents=$3, price_cents=$4, low_stock_threshold=$5, active=$6 WHERE id=$7', [...params, id]);
    } else {
      await query('INSERT INTO products (name, sku, purchase_cents, price_cents, low_stock_threshold, active, stock_qty) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [...params, Math.max(0, Number(s(f, 'stock')) || 0)]);
    }
  } catch (e) {
    if ((e as { code?: string }).code === '23505') back('/gestion/produits', { error: 'Référence (SKU) déjà utilisée.' });
    throw e;
  }
  await audit(user.id, 'product.save', 'product', id || null);
  back('/gestion/produits', { msg: 'Produit enregistré.' });
}

export async function restockAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const qty = Math.trunc(Number(s(f, 'quantity')));
  if (!UUID.test(id) || !qty || Math.abs(qty) > 1000) back('/gestion/produits', { error: 'Quantité invalide.' });
  await query('UPDATE products SET stock_qty = GREATEST(stock_qty + $2, 0) WHERE id = $1', [id, qty]);
  await audit(user.id, 'product.restock', 'product', id, { qty });
  back('/gestion/produits', { msg: `Stock ajusté (${qty > 0 ? '+' : ''}${qty}).` });
}

/* ---------------- Prestations & réglages ---------------- */

export async function saveServiceAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const price = parseEurosToCents(s(f, 'price'));
  const duration = Number(s(f, 'duration'));
  const nameFr = s(f, 'nameFr');
  if (!nameFr || price === null || !(duration >= 5 && duration <= 480)) back('/gestion/prestations', { error: 'Nom, prix et durée (5–480 min) obligatoires.' });
  const days = f.getAll('days').map(Number).filter((d) => d >= 0 && d <= 6);
  const params = [nameFr, s(f, 'nameEs') || null, s(f, 'nameNl') || null, s(f, 'nameEn') || null, s(f, 'category') || 'HOMME',
    duration, price, days.length && days.length < 7 ? days : null, f.get('online') === 'on', f.get('active') === 'on', Number(s(f, 'sort')) || 0];
  if (UUID.test(id)) {
    await query(`UPDATE services SET name_fr=$1, name_es=$2, name_nl=$3, name_en=$4, category=$5, duration_min=$6, price_cents=$7,
      allowed_days=$8, online=$9, active=$10, sort=$11 WHERE id=$12`, [...params, id]);
  } else {
    const slug = `${nameFr.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
    await query(`INSERT INTO services (name_fr, name_es, name_nl, name_en, category, duration_min, price_cents, allowed_days, online, active, sort, slug)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [...params, slug]);
  }
  await audit(user.id, 'service.save', 'service', id || null, { nameFr, price, duration });
  revalidatePath('/', 'layout');
  back('/gestion/prestations', { msg: 'Prestation enregistrée (site public mis à jour).' });
}

export async function saveHoursAction(f: FormData) {
  const user = await requireRole('OWNER');
  const re = /^\d{2}:\d{2}$/;
  for (let d = 0; d <= 6; d++) {
    const closed = f.get(`closed_${d}`) === 'on';
    const opens = s(f, `opens_${d}`), closes = s(f, `closes_${d}`);
    if (!closed && (!re.test(opens) || !re.test(closes) || opens >= closes)) back('/gestion/reglages', { error: 'Horaire invalide (ouverture avant fermeture).' });
  }
  await tx(async (c) => {
    for (let d = 0; d <= 6; d++) {
      const closed = f.get(`closed_${d}`) === 'on';
      await c.query(
        `INSERT INTO opening_hours (weekday, opens, closes) VALUES ($1,$2,$3)
         ON CONFLICT (weekday) DO UPDATE SET opens = EXCLUDED.opens, closes = EXCLUDED.closes`,
        [d, closed ? null : s(f, `opens_${d}`), closed ? null : s(f, `closes_${d}`)]);
    }
  });
  await audit(user.id, 'hours.update', 'opening_hours', null);
  revalidatePath('/', 'layout');
  back('/gestion/reglages', { msg: 'Horaires enregistrés.' });
}

/* ---------------- Tombola (owner only, spec 009) ---------------- */

export async function addLotteryTicketAction(f: FormData) {
  const user = await requireRole('OWNER');
  if (!SALON.features.tombola) redirect('/gestion'); // module switched off (SALON.features)
  const { randomInt } = await import('node:crypto');
  const { ticketNumber } = await import('@/domain/lottery');
  const phone = normalizePhone(s(f, 'phone'));
  const drawDate = s(f, 'drawDate');
  if (!phone || !isIsoDate(drawDate)) back('/gestion/tombola', { error: 'Téléphone du client et date du tirage obligatoires.' });
  const client = await queryOne<{ id: string }>('SELECT id FROM clients WHERE phone = $1', [phone]);
  if (!client) back('/gestion/tombola', { error: 'Client introuvable : créez-le d’abord dans Clients.' });
  const drawn = await queryOne('SELECT 1 FROM lottery_tickets WHERE draw_date = $1 AND is_winner', [drawDate]);
  if (drawn) back('/gestion/tombola', { error: 'Ce tirage a déjà eu lieu.' });
  const existing = new Set((await query<{ ticket_num: string }>('SELECT ticket_num FROM lottery_tickets WHERE draw_date = $1', [drawDate])).map((r) => r.ticket_num));
  const num = ticketNumber(drawDate, existing, () => randomInt(10000) / 10000);
  await query('INSERT INTO lottery_tickets (ticket_num, draw_date, client_id, created_by) VALUES ($1, $2, $3, $4)', [num, drawDate, client!.id, user.id]);
  await audit(user.id, 'lottery.ticket', 'lottery_ticket', num);
  back('/gestion/tombola', { msg: `Ticket ${num} attribué.` });
}

export async function drawLotteryAction(f: FormData) {
  const user = await requireRole('OWNER');
  if (!SALON.features.tombola) redirect('/gestion'); // module switched off (SALON.features)
  const { randomInt } = await import('node:crypto');
  const { pickWinner } = await import('@/domain/lottery');
  const drawDate = s(f, 'drawDate');
  if (!isIsoDate(drawDate)) back('/gestion/tombola', { error: 'Date de tirage invalide.' });
  const winner = await tx(async (c) => {
    const done = await c.query('SELECT 1 FROM lottery_tickets WHERE draw_date = $1 AND is_winner FOR UPDATE', [drawDate]);
    if (done.rowCount) return null;
    const tickets = (await c.query<{ id: string; ticket_num: string }>('SELECT id, ticket_num FROM lottery_tickets WHERE draw_date = $1 ORDER BY ticket_num FOR UPDATE', [drawDate])).rows;
    if (!tickets.length) return null;
    const w = pickWinner(tickets, (n) => randomInt(n));
    await c.query('UPDATE lottery_tickets SET is_winner = true WHERE id = $1', [w.id]);
    return w;
  });
  if (!winner) back('/gestion/tombola', { error: 'Aucun ticket, ou tirage déjà fait.' });
  await audit(user.id, 'lottery.draw', 'lottery_ticket', winner!.ticket_num, { drawDate });
  back('/gestion/tombola', { msg: `Gagnant : ticket ${winner!.ticket_num}.` });
}

/* ---------------- Robust SI · JOHN (spec 011) ---------------- */

export async function requestJohnReportAction(f: FormData) {
  const user = await requireRole('OWNER');
  const period = s(f, 'period');
  const language = s(f, 'language') === 'en' ? 'en' : 'fr';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) back('/gestion/robust-si', { error: 'Mois invalide.' });
  const busy = await queryOne(`SELECT 1 FROM john_reports WHERE period_key = $1 AND language = $2 AND status IN ('QUEUED','RUNNING')`, [period, language]);
  if (busy) back('/gestion/robust-si', { msg: 'Ce rapport est déjà en préparation.' });
  const { loadMonthlyFacts } = await import('@/lib/john');
  const facts = await loadMonthlyFacts(period, language);
  await query('INSERT INTO john_reports (period_key, language, facts, requested_by) VALUES ($1, $2, $3, $4)', [period, language, JSON.stringify(facts), user.id]);
  const { triggerCloudWorker } = await import('@/lib/john');
  after(triggerCloudWorker); // wake the cloud GPU worker, if configured (spec 011)
  await audit(user.id, 'john.request', 'john_report', period, { language });
  back('/gestion/robust-si', { msg: 'Demande envoyée à JOHN. La vidéo sera prête dans quelques minutes.' });
}

/* ---------------- Ambassadeurs (spec 010) ---------------- */

export async function decideApplicationAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const approve = s(f, 'decision') === 'APPROVED';
  const percent = Math.round(Number(s(f, 'percent') || '10'));
  if (!UUID.test(id) || (approve && !(percent >= 1 && percent <= 50))) back('/gestion/ambassadeurs', { error: 'Remise entre 1 et 50 %.' });
  const { makePromoCode, makeSlug } = await import('@/domain/ambassadors');
  const result = await tx(async (c) => {
    const app = (await c.query<{ first_name: string; last_name: string; phone: string; instagram: string | null; tiktok: string | null }>(
      `UPDATE ambassador_applications SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1 AND status = 'PENDING'
       RETURNING first_name, last_name, phone, instagram, tiktok`, [id, approve ? 'APPROVED' : 'REJECTED', user.id])).rows[0];
    if (!app || !approve) return app ? 'rejected' : null;
    const name = `${app.first_name} ${app.last_name}`.trim();
    const slugs = new Set((await c.query<{ s: string }>('SELECT lower(slug) AS s FROM ambassadors')).rows.map((r) => r.s));
    const amb = (await c.query<{ id: string }>(
      `INSERT INTO ambassadors (application_id, display_name, slug, phone, instagram, tiktok) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [id, name, makeSlug(name, slugs), app.phone, app.instagram, app.tiktok])).rows[0];
    const codes = new Set((await c.query<{ c: string }>('SELECT upper(code) AS c FROM promo_codes')).rows.map((r) => r.c));
    const code = makePromoCode(app.first_name, percent, codes);
    await c.query('INSERT INTO promo_codes (code, ambassador_id, percent) VALUES ($1,$2,$3)', [code, amb.id, percent]);
    return code;
  });
  if (!result) back('/gestion/ambassadeurs', { error: 'Candidature déjà traitée.' });
  await audit(user.id, approve ? 'ambassador.approve' : 'ambassador.reject', 'ambassador_application', id, approve ? { code: result } : undefined);
  back('/gestion/ambassadeurs', { msg: approve ? `Ambassadeur créé, code ${result}.` : 'Candidature refusée.' });
}

export async function updatePromoAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  const percent = Math.round(Number(s(f, 'percent')));
  const maxUses = s(f, 'maxUses') ? Math.round(Number(s(f, 'maxUses'))) : null;
  const validUntil = s(f, 'validUntil') || null;
  if (!UUID.test(id) || !(percent >= 1 && percent <= 50) || (maxUses !== null && !(maxUses > 0)) || (validUntil && !isIsoDate(validUntil))) {
    back('/gestion/ambassadeurs', { error: 'Remise 1–50 %, utilisations > 0, date valide.' });
  }
  const r = await queryOne<{ id: string }>(
    `UPDATE promo_codes SET percent = $2, max_uses = $3, valid_until = $4, active = $5 WHERE id = $1 AND ($3::int IS NULL OR uses <= $3) RETURNING id`,
    [id, percent, maxUses, validUntil, s(f, 'active') === 'on']);
  if (!r) back('/gestion/ambassadeurs', { error: 'Le maximum ne peut pas être inférieur aux utilisations déjà faites.' });
  await audit(user.id, 'promo.update', 'promo_code', id, { percent, maxUses, validUntil });
  back('/gestion/ambassadeurs', { msg: 'Code mis à jour.' });
}

export async function toggleAmbassadorAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id');
  if (UUID.test(id)) {
    await query('UPDATE ambassadors SET active = NOT active WHERE id = $1', [id]);
    await audit(user.id, 'ambassador.toggle', 'ambassador', id);
  }
  back('/gestion/ambassadeurs', { msg: 'Statut mis à jour.' });
}

/* ---------------- Ambassadeurs, phases 4-7 (spec 010) ---------------- */

const AMB = (id: string) => `/gestion/ambassadeurs/${id}`;

async function ledgerOf(c: import('pg').PoolClient, allowanceId: string) {
  const { allowanceBalance } = await import('@/domain/ambassador-program');
  const rows = (await c.query<{ id: string; kind: 'ALLOCATION' | 'CONSUMPTION' | 'EXPIRATION' | 'ADJUSTMENT' | 'REVERSAL'; qty: number; reverses_id: string | null }>(
    'SELECT id, kind, qty, reverses_id FROM allowance_ledger WHERE allowance_id = $1 ORDER BY id', [allowanceId])).rows
    .map((r) => ({ id: Number(r.id), kind: r.kind, qty: r.qty, reversesId: r.reverses_id ? Number(r.reverses_id) : null }));
  return { rows, balance: allowanceBalance(rows) };
}

export async function proposeAllowanceAction(f: FormData) {
  const user = await requireRole('OWNER');
  const amb = s(f, 'ambassadorId');
  const qty = Math.round(Number(s(f, 'quantity')));
  const serviceId = uuidOrNull(s(f, 'serviceId'));
  const validUntil = s(f, 'validUntil') || null;
  if (!UUID.test(amb) || !(qty >= 1 && qty <= 50) || (validUntil && !isIsoDate(validUntil)) || !s(f, 'reason')) back(AMB(amb), { error: 'Nombre 1–50, date valide et raison obligatoires.' });
  await query('INSERT INTO service_allowances (ambassador_id, service_id, quantity, valid_until, reason, proposed_by) VALUES ($1,$2,$3,$4,$5,$6)',
    [amb, serviceId, qty, validUntil, s(f, 'reason').slice(0, 300), user.id]);
  await audit(user.id, 'allowance.propose', 'ambassador', amb, { qty, serviceId });
  back(AMB(amb), { msg: user.role === 'OWNER' ? 'Enveloppe proposée : valide-la ci-dessous.' : 'Enveloppe proposée : la direction doit la valider.' });
}

export async function decideAllowanceAction(f: FormData) {
  const user = await requireRole('OWNER'); // only a human owner allocates, never a score
  const id = s(f, 'id'); const amb = s(f, 'ambassadorId');
  const approve = s(f, 'decision') === 'APPROVED';
  if (!UUID.test(id) || !UUID.test(amb)) back('/gestion/ambassadeurs', { error: 'Enveloppe inconnue.' });
  const ok = await tx(async (c) => {
    const a = (await c.query<{ quantity: number }>(
      `UPDATE service_allowances SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1 AND status = 'PROPOSED' RETURNING quantity`,
      [id, approve ? 'APPROVED' : 'REJECTED', user.id])).rows[0];
    if (!a) return false;
    if (approve) await c.query(`INSERT INTO allowance_ledger (allowance_id, kind, qty, idempotency_key, reason, created_by) VALUES ($1,'ALLOCATION',$2,$3,'Validation',$4)`, [id, a.quantity, `alloc:${id}`, user.id]);
    return true;
  });
  if (!ok) back(AMB(amb), { error: 'Enveloppe déjà traitée.' });
  await audit(user.id, approve ? 'allowance.approve' : 'allowance.reject', 'service_allowance', id);
  back(AMB(amb), { msg: approve ? 'Enveloppe validée.' : 'Enveloppe refusée.' });
}

export async function adjustAllowanceAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id'); const amb = s(f, 'ambassadorId');
  const op = s(f, 'op');
  const reason = s(f, 'reason').slice(0, 300);
  if (!UUID.test(id) || !UUID.test(amb) || !reason) back(AMB(amb), { error: 'Raison obligatoire.' });
  const { randomUUID } = await import('node:crypto');
  const { canReverse } = await import('@/domain/ambassador-program');
  const err = await tx(async (c) => {
    await c.query('SELECT 1 FROM service_allowances WHERE id = $1 AND status = $2 FOR UPDATE', [id, 'APPROVED']);
    const { rows, balance } = await ledgerOf(c, id);
    if (op === 'expire') {
      if (balance.available <= 0) return 'Rien à faire expirer.';
      await c.query(`INSERT INTO allowance_ledger (allowance_id, kind, qty, idempotency_key, reason, created_by) VALUES ($1,'EXPIRATION',$2,$3,$4,$5)`,
        [id, -balance.available, `expire:${id}:${rows.length}`, reason, user.id]);
    } else if (op === 'reverse') {
      const target = rows.find((r) => r.id === Number(s(f, 'entryId')));
      if (!target || !canReverse(target, rows)) return 'Écriture déjà annulée ou non annulable.';
      if (balance.available - target.qty < 0) return 'Annulation impossible : le solde deviendrait négatif.';
      await c.query(`INSERT INTO allowance_ledger (allowance_id, kind, qty, reverses_id, idempotency_key, reason, created_by) VALUES ($1,'REVERSAL',$2,$3,$4,$5,$6)`,
        [id, -target.qty, target.id, `rev:${target.id}`, reason, user.id]);
    } else {
      const qty = Math.round(Number(s(f, 'qty')));
      if (!qty || Math.abs(qty) > 20) return 'Ajustement entre −20 et +20.';
      if (balance.available + qty < 0) return 'Le solde ne peut pas devenir négatif.';
      await c.query(`INSERT INTO allowance_ledger (allowance_id, kind, qty, idempotency_key, reason, created_by) VALUES ($1,'ADJUSTMENT',$2,$3,$4,$5)`,
        [id, qty, `adj:${randomUUID()}`, reason, user.id]);
    }
    return null;
  });
  if (err) back(AMB(amb), { error: err });
  await audit(user.id, `allowance.${op || 'adjust'}`, 'service_allowance', id, { reason });
  back(AMB(amb), { msg: 'Écriture ajoutée au registre.' });
}

export async function addDeliverableAction(f: FormData) {
  const user = await requireRole('OWNER');
  const amb = s(f, 'ambassadorId');
  const kind = ['REEL', 'POST', 'STORY', 'TIKTOK', 'AUTRE'].includes(s(f, 'kind')) ? s(f, 'kind') : 'AUTRE';
  const due = s(f, 'dueDate') || null;
  if (!UUID.test(amb) || !s(f, 'title') || (due && !isIsoDate(due))) back(AMB(amb), { error: 'Titre et date valides obligatoires.' });
  await query('INSERT INTO deliverables (ambassador_id, kind, title, due_date, created_by) VALUES ($1,$2,$3,$4,$5)', [amb, kind, s(f, 'title').slice(0, 200), due, user.id]);
  back(AMB(amb), { msg: 'Contenu demandé.' });
}

export async function reviewDeliverableAction(f: FormData) {
  const user = await requireRole('OWNER');
  const id = s(f, 'id'); const amb = s(f, 'ambassadorId');
  const status = s(f, 'decision') === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  if (!UUID.test(id)) back(AMB(amb), { error: 'Contenu inconnu.' });
  const r = await queryOne(`UPDATE deliverables SET status = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4 WHERE id = $1 AND status = 'SUBMITTED' RETURNING id`,
    [id, status, user.id, s(f, 'note').slice(0, 300) || null]);
  if (!r) back(AMB(amb), { error: 'Ce contenu n’attend pas de validation.' });
  await audit(user.id, `deliverable.${status.toLowerCase()}`, 'deliverable', id);
  back(AMB(amb), { msg: status === 'APPROVED' ? 'Contenu validé.' : 'Contenu refusé.' });
}

export async function addAssessmentAction(f: FormData) {
  const user = await requireRole('OWNER');
  const amb = s(f, 'ambassadorId');
  const phase = s(f, 'phase') === 'PERFORMANCE' ? 'PERFORMANCE' : 'POTENTIAL';
  const { CRITERIA, cleanScores, scoreOf } = await import('@/domain/ambassador-program');
  let scores;
  try { scores = cleanScores(Object.fromEntries(CRITERIA.map((c) => [c.key, s(f, c.key)]))); } catch (e) { back(AMB(amb), { error: (e as Error).message }); }
  const { score, recommendation } = scoreOf(scores!, phase);
  const override = s(f, 'override');
  const reason = s(f, 'overrideReason').slice(0, 300);
  if (override && !reason) back(AMB(amb), { error: 'Une dérogation exige une raison.' });
  await query(`INSERT INTO score_assessments (ambassador_id, phase, criteria, score, recommendation, override_reason, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [amb, phase, JSON.stringify(scores), score, override || recommendation, override ? reason : null, user.id]);
  await audit(user.id, 'ambassador.score', 'ambassador', amb, { phase, score });
  back(AMB(amb), { msg: score === null ? 'Évaluation enregistrée (aucun critère noté).' : `Évaluation enregistrée : ${score}/100.` });
}

export async function portalLinkAction(_prev: { url?: string; error?: string } | null, f: FormData): Promise<{ url?: string; error?: string }> {
  const user = await requireRole('OWNER');
  const amb = s(f, 'ambassadorId');
  if (!UUID.test(amb)) return { error: 'Ambassadeur inconnu.' };
  const { rotatePortalToken } = await import('@/lib/ambassador-portal');
  const { SITE_URL } = await import('@/config/salon');
  const token = await rotatePortalToken(amb);
  await audit(user.id, 'ambassador.portal_link', 'ambassador', amb);
  // Returned once to the page that asked for it; only its SHA-256 is stored.
  return { url: `${SITE_URL}/ambassadeurs/portail/acces#t=${token}` };
}
