// Private iCalendar feed of one barber's upcoming appointments (subscribe from iPhone / Google).
import { timingSafeEqual } from 'node:crypto';
import { type NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { buildIcs, feedToken } from '@/lib/ics';

export async function GET(req: NextRequest, ctx: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await ctx.params;
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const expected = /^[0-9a-f-]{36}$/i.test(staffId) ? feedToken(staffId) : '';
  if (!expected || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return new Response('Forbidden', { status: 403 });
  }
  const staff = await queryOne<{ display_name: string }>('SELECT display_name FROM staff WHERE id = $1 AND active', [staffId]);
  if (!staff) return new Response('Not found', { status: 404 });
  const rows = await query<{ id: string; starts_at: Date; ends_at: Date; service: string; first_name: string; last_name: string; phone: string; notes: string | null }>(
    `SELECT a.id, a.starts_at, a.ends_at, s.name_fr AS service, c.first_name, c.last_name, c.phone, a.notes
       FROM appointments a JOIN services s ON s.id = a.service_id JOIN clients c ON c.id = a.client_id
      WHERE a.staff_id = $1 AND a.status = 'BOOKED' AND a.starts_at > now() - interval '7 days'
      ORDER BY a.starts_at LIMIT 500`,
    [staffId],
  );
  const ics = buildIcs(`${staff.display_name} — RDV`, rows.map((r) => ({
    uid: r.id, start: r.starts_at, end: r.ends_at, summary: `${r.service} — ${r.first_name} ${r.last_name}`.trim(),
    description: [`Tél: ${r.phone}`, r.notes ? `Notes: ${r.notes}` : ''].filter(Boolean).join('\n'),
  })));
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
}
