// Server-side authorisation. Every management page and server action calls
// requireRole(): the proxy only does an optimistic redirect.
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { SESSION_COOKIE, verifySession, type Role } from '@/lib/session';

export type CurrentUser = { id: string; role: Role; name: string; email: string | null };

export async function currentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  // Re-check in DB so a deactivated account loses access immediately.
  const row = await queryOne<{ id: string; role: Role; display_name: string; email: string | null }>(
    'SELECT id, role, display_name, email FROM staff WHERE id = $1 AND active AND password_hash IS NOT NULL',
    [session.sub],
  );
  return row ? { id: row.id, role: row.role, name: row.display_name, email: row.email } : null;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect('/gestion/login');
  if (roles.length && !roles.includes(user.role)) redirect('/gestion');
  return user;
}

export const MANAGERS: Role[] = ['OWNER', 'MANAGER'];
