// Session token (edge-safe: used by proxy.ts and server code).
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export type Role = 'OWNER' | 'MANAGER' | 'BARBER';
export const SESSION_COOKIE = 'lbs_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type Session = JWTPayload & { sub: string; role: Role; name: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('AUTH_JWT_SECRET is required');
    return new TextEncoder().encode('dev-only-secret-change-me-dev-only-secret');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: { sub: string; role: Role; name: string }): Promise<string> {
  return new SignJWT({ role: p.role, name: p.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !['OWNER', 'MANAGER', 'BARBER'].includes(payload.role as string)) return null;
    return payload as Session;
  } catch {
    return null;
  }
}
