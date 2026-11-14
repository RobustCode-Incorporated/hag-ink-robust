import { NextResponse, type NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { normalizePhone } from '@/lib/format';
import { rateLimited } from '@/lib/ambassadors';

// Public application (spec 010, phase 1). Honeypot, consent, 5 per hour per IP (pseudonymised).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  const str = (k: string, max = 200) => (typeof body[k] === 'string' ? (body[k] as string).trim().slice(0, max) : '');
  if (str('website')) return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: 'CONSENT' }, { status: 400 });
  const phone = normalizePhone(str('phone'));
  const handle = (v: string) => v.replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, '').replace(/^@/, '').replace(/[^\w.]/g, '').slice(0, 40) || null;
  const instagram = handle(str('instagram')), tiktok = handle(str('tiktok'));
  const email = str('email', 120);
  if (!str('firstName', 60) || !phone || (!instagram && !tiktok) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (await rateLimited('amb-apply', ip, 5, 60)) return NextResponse.json({ error: 'RATE' }, { status: 429 });
  try {
    await query(
      `INSERT INTO ambassador_applications (first_name, last_name, phone, email, instagram, tiktok, audience, motivation, consent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
      [str('firstName', 60), str('lastName', 60), phone, email || null, instagram, tiktok, str('audience', 200) || null, str('motivation', 1000) || null]);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return NextResponse.json({ error: 'DUPLICATE' }, { status: 409 });
    throw e;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
