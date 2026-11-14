import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { audit, query } from '@/lib/db';
import { toCsv } from '@/domain/ambassador-program';
import { SALON } from '@/config/salon';

// CSV exports (spec 010, phase 6). No client identity in any export; discount cost only for the owner.
export async function GET(req: NextRequest) {
  const user = await requireRole('OWNER');
  const isOwner = user.role === 'OWNER';
  const type = req.nextUrl.searchParams.get('type') === 'bookings' ? 'bookings' : 'ambassadors';
  const tz = SALON.timezone;
  let csv: string;
  if (type === 'ambassadors') {
    const rows = await query<Record<string, string | number | null>>(
      `SELECT a.display_name, a.slug, a.instagram, a.tiktok, a.active,
              (SELECT string_agg(p.code || ' (' || p.percent || '%)', ', ') FROM promo_codes p WHERE p.ambassador_id = a.id) AS codes,
              (SELECT count(*) FROM referral_visits v WHERE v.ambassador_id = a.id) AS visits,
              (SELECT count(*) FROM booking_attributions b WHERE b.ambassador_id = a.id) AS bookings,
              (SELECT count(*) FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = a.id AND ap.status = 'COMPLETED') AS completed,
              (SELECT count(*) FROM booking_attributions b JOIN appointments ap ON ap.id = b.appointment_id WHERE b.ambassador_id = a.id AND ap.status = 'COMPLETED' AND b.is_new_client) AS new_clients,
              (SELECT COALESCE(sum(sa.amount_cents),0) FROM booking_attributions b JOIN sales sa ON sa.appointment_id = b.appointment_id AND sa.voided_at IS NULL WHERE b.ambassador_id = a.id) AS revenue_cents,
              (SELECT COALESCE(sum(r.discount_cents),0) FROM promo_redemptions r JOIN promo_codes p ON p.id = r.promo_code_id WHERE p.ambassador_id = a.id) AS discount_cents,
              (SELECT COALESCE(-sum(l.qty) FILTER (WHERE l.kind = 'CONSUMPTION'), 0)
                     - COALESCE(sum(l.qty) FILTER (WHERE l.kind = 'REVERSAL' AND t.kind = 'CONSUMPTION'), 0)
                FROM allowance_ledger l LEFT JOIN allowance_ledger t ON t.id = l.reverses_id JOIN service_allowances s ON s.id = l.allowance_id WHERE s.ambassador_id = a.id) AS free_services
         FROM ambassadors a ORDER BY a.created_at`);
    const head = ['Ambassadeur', 'Lien', 'Instagram', 'TikTok', 'Actif', 'Codes', 'Visites', 'Réservations', 'Réalisées', 'Nouveaux clients', `CA (${SALON.currency})`, 'Prestations offertes', ...(isOwner ? [`Remises (${SALON.currency})`] : [])];
    csv = toCsv(head, rows.map((r) => [r.display_name, `/experience/${r.slug}`, r.instagram, r.tiktok, r.active ? 'oui' : 'non', r.codes, r.visits, r.bookings, r.completed, r.new_clients,
      (Number(r.revenue_cents) / 100).toFixed(2), r.free_services, ...(isOwner ? [(Number(r.discount_cents) / 100).toFixed(2)] : [])]));
  } else {
    const rows = await query<Record<string, string | number | boolean | null>>(
      `SELECT to_char(ap.starts_at AT TIME ZONE '${tz}', 'YYYY-MM-DD HH24:MI') AS at, a.display_name, b.via, p.code, b.has_conflict, b.is_new_client, ap.status,
              sv.name_fr AS service, sa.amount_cents, r.discount_cents
         FROM booking_attributions b JOIN ambassadors a ON a.id = b.ambassador_id JOIN appointments ap ON ap.id = b.appointment_id
         JOIN services sv ON sv.id = ap.service_id LEFT JOIN promo_codes p ON p.id = b.promo_code_id
         LEFT JOIN sales sa ON sa.appointment_id = ap.id AND sa.voided_at IS NULL LEFT JOIN promo_redemptions r ON r.appointment_id = ap.id
        ORDER BY ap.starts_at DESC`);
    const head = ['Rendez-vous', 'Ambassadeur', 'Source', 'Code', 'Conflit', 'Nouveau client', 'Statut', 'Prestation', `Encaissé (${SALON.currency})`, ...(isOwner ? [`Remise (${SALON.currency})`] : [])];
    csv = toCsv(head, rows.map((r) => [r.at, r.display_name, r.via, r.code, r.has_conflict ? 'oui' : 'non', r.is_new_client ? 'oui' : 'non', r.status, r.service,
      r.amount_cents === null ? '' : (Number(r.amount_cents) / 100).toFixed(2), ...(isOwner ? [r.discount_cents === null ? '' : (Number(r.discount_cents) / 100).toFixed(2)] : [])]));
  }
  await audit(user.id, 'ambassador.export', 'csv', type);
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="hag-ink-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'private, no-store' },
  });
}
