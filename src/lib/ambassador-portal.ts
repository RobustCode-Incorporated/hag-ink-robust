// Creator portal sessions (spec 010, phase 7). The secret link is never stored: only its SHA-256.
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';

export const PORTAL_COOKIE = 'hi_amb';
const DAYS = 30;
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** New personal link secret; replaces the old one and closes its sessions. */
export async function rotatePortalToken(ambassadorId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await query('UPDATE ambassadors SET portal_token_hash = $2, portal_token_at = now() WHERE id = $1', [ambassadorId, sha256(token)]);
  await query('DELETE FROM ambassador_sessions WHERE ambassador_id = $1', [ambassadorId]);
  return token;
}

/** Exchanges the link secret for a session id (cookie value). */
export async function openSession(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const amb = await queryOne<{ id: string }>('SELECT id FROM ambassadors WHERE portal_token_hash = $1 AND active', [sha256(token)]);
  if (!amb) return null;
  const sid = randomBytes(32).toString('base64url');
  await query(`INSERT INTO ambassador_sessions (id_hash, ambassador_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`, [sha256(sid), amb.id, DAYS]);
  return sid;
}

export const sessionCookie = (sid: string) => ({ name: PORTAL_COOKIE, value: sid, httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/', maxAge: DAYS * 86400 });

/** Current creator, from the cookie. Every portal read is filtered by this id, never by an id from the URL. */
export async function currentAmbassador(): Promise<{ id: string; display_name: string; slug: string } | null> {
  const sid = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!sid) return null;
  return queryOne(
    `SELECT a.id, a.display_name, a.slug FROM ambassador_sessions s JOIN ambassadors a ON a.id = s.ambassador_id
      WHERE s.id_hash = $1 AND s.expires_at > now() AND a.active`, [sha256(sid)]);
}

/** CSRF: cookie-authenticated mutations must come from our own origin. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !!origin && new URL(origin).host === new URL(req.url).host;
}
