import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { PORTAL_COOKIE, sameOrigin, sha256 } from '@/lib/ambassador-portal';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'ORIGIN' }, { status: 403 });
  const sid = req.cookies.get(PORTAL_COOKIE)?.value;
  if (sid) await query('DELETE FROM ambassador_sessions WHERE id_hash = $1', [sha256(sid)]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: PORTAL_COOKIE, value: '', path: '/', maxAge: 0 });
  return res;
}
