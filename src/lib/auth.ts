import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export type AuthRole = 'CEO' | 'MANAGER';

export const SESSION_COOKIE_NAME = 'hag_session_v2';
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionPayload = JWTPayload & {
  role: AuthRole;
  email: string;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isManagementOnlyModeEnabled(): boolean {
  return parseBoolean(process.env.NEXT_PUBLIC_MANAGEMENT_ONLY, true);
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_JWT_SECRET is required in production.');
  }

  const fallback = 'development-only-secret-change-me';
  return new TextEncoder().encode(secret ?? fallback);
}

export async function createSessionToken(payload: { role: AuthRole; email: string }): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.role !== 'CEO' && payload.role !== 'MANAGER') return null;
    if (typeof payload.email !== 'string' || !payload.email.trim()) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function roleHome(role: AuthRole): string {
  return role === 'CEO' ? '/ceo' : '/manager';
}

export function sessionCookieDomainForHost(hostname: string): string | undefined {
  const normalizedHost = hostname.trim().toLowerCase();
  const configuredHost = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN?.trim().toLowerCase();
  const configuredBaseDomain = configuredHost?.startsWith('www.') ? configuredHost.slice(4) : configuredHost;

  if (configuredBaseDomain) {
    if (normalizedHost === configuredBaseDomain || normalizedHost === `www.${configuredBaseDomain}`) {
      return `.${configuredBaseDomain}`;
    }
    return undefined;
  }

  if (normalizedHost === 'hag-ink.com' || normalizedHost === 'www.hag-ink.com') {
    return '.hag-ink.com';
  }

  return undefined;
}
