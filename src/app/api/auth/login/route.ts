import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { audit, query, queryOne } from '@/lib/db';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, type Role } from '@/lib/session';

const MAX_ATTEMPTS = 8; // per email or IP, per 15 minutes

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'Identifiants requis.' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const recent = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts WHERE key = ANY($1) AND at > now() - interval '15 minutes'`,
    [[`e:${email}`, `ip:${ip}`]],
  );
  if ((recent?.n ?? 0) >= MAX_ATTEMPTS * 2) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
  }

  const user = await queryOne<{ id: string; role: Role; display_name: string; password_hash: string }>(
    'SELECT id, role, display_name, password_hash FROM staff WHERE lower(email) = $1 AND active AND password_hash IS NOT NULL',
    [email],
  );
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !ok) {
    await query('INSERT INTO login_attempts (key) VALUES ($1), ($2)', [`e:${email}`, `ip:${ip}`]);
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
  }
  await query('DELETE FROM login_attempts WHERE key = $1', [`e:${email}`]);
  await audit(user.id, 'login', 'staff', user.id);

  const res = NextResponse.json({ redirectTo: '/gestion' });
  res.cookies.set({
    name: SESSION_COOKIE, value: await signSession({ sub: user.id, role: user.role, name: user.display_name }),
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
