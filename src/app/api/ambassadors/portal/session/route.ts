import { NextResponse, type NextRequest } from 'next/server';
import { openSession, sameOrigin, sessionCookie } from '@/lib/ambassador-portal';
import { rateLimited } from '@/lib/ambassadors';

// Exchanges the secret of the personal link (sent in the body, read from the URL fragment) for a 30-day session.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'ORIGIN' }, { status: 403 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (await rateLimited('amb-portal', ip, 10, 15)) return NextResponse.json({ error: 'RATE' }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const sid = typeof body?.token === 'string' ? await openSession(body.token) : null;
  if (!sid) return NextResponse.json({ error: 'INVALID' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(sid));
  return res;
}
