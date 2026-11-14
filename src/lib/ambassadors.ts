// Ambassador program, server side (spec 010).
import 'server-only';
import { createHash } from 'node:crypto';
import { query, queryOne } from '@/lib/db';
import { isBot } from '@/domain/ambassadors';

export type PublicAmbassador = { id: string; slug: string; display_name: string; code: string | null; percent: number | null };

export async function findAmbassador(slug: string): Promise<PublicAmbassador | null> {
  const s = slug.trim().toLowerCase().slice(0, 60);
  if (!/^[a-z0-9-]+$/.test(s)) return null;
  return queryOne<PublicAmbassador>(
    `SELECT a.id, a.slug, a.display_name,
            (SELECT p.code FROM promo_codes p WHERE p.ambassador_id = a.id AND p.active AND (p.valid_until IS NULL OR p.valid_until >= CURRENT_DATE)
              AND (p.max_uses IS NULL OR p.uses < p.max_uses) ORDER BY p.created_at DESC LIMIT 1) AS code,
            (SELECT p.percent FROM promo_codes p WHERE p.ambassador_id = a.id AND p.active ORDER BY p.created_at DESC LIMIT 1) AS percent
       FROM ambassadors a WHERE lower(a.slug) = $1 AND a.active`, [s]);
}

/** Counts a link visit: nothing about the visitor is stored; previews and bots are skipped. */
export async function recordVisit(ambassadorId: string, userAgent: string | null): Promise<void> {
  if (isBot(userAgent)) return;
  await query('INSERT INTO referral_visits (ambassador_id) VALUES ($1)', [ambassadorId]);
}

/** Simple rate limit on a pseudonymised key (reuses login_attempts). */
export async function rateLimited(kind: string, ip: string, max: number, minutes: number): Promise<boolean> {
  const key = `${kind}:${createHash('sha256').update(`${kind}|${ip}`).digest('hex').slice(0, 32)}`;
  const row = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_attempts WHERE key = $1 AND at > now() - make_interval(mins => $2)`, [key, minutes]);
  if ((row?.n ?? 0) >= max) return true;
  await query('INSERT INTO login_attempts (key) VALUES ($1)', [key]);
  return false;
}
