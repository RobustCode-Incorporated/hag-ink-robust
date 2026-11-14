import { NextResponse, type NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { currentAmbassador, sameOrigin } from '@/lib/ambassador-portal';

// The creator submits the link of a requested content. Filtered by the session, never by an id from the client alone.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'ORIGIN' }, { status: 403 });
  const amb = await currentAmbassador();
  if (!amb) return NextResponse.json({ error: 'SESSION' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; url?: unknown } | null;
  const id = typeof body?.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  let url: URL | null = null;
  try { url = typeof body?.url === 'string' && body.url.length <= 300 ? new URL(body.url.trim()) : null; } catch { url = null; }
  if (!id || !url || url.protocol !== 'https:') return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  const r = await queryOne(
    `UPDATE deliverables SET url = $3, status = 'SUBMITTED', submitted_at = now(), review_note = NULL
      WHERE id = $1 AND ambassador_id = $2 AND status IN ('EXPECTED', 'REJECTED') RETURNING id`, [id, amb.id, url.toString()]);
  if (!r) return NextResponse.json({ error: 'INVALID' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
