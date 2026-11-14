import { findByToken } from '@/lib/booking';
import { buildIcs } from '@/lib/ics';
import { SALON } from '@/config/salon';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const b = await findByToken(token);
  if (!b || b.status === 'CANCELLED') return new Response('Not found', { status: 404 });
  const ics = buildIcs(SALON.name, [{
    uid: b.id, start: b.starts_at, end: b.ends_at, summary: `${b.service_name} — ${SALON.name}`, description: `Barber: ${b.staff_name}`,
  }]);
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="rendez-vous.ics"' },
  });
}
