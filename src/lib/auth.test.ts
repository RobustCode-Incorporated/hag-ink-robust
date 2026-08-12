import { describe, expect, it, vi } from 'vitest';
import {
  SESSION_TTL_SECONDS,
  buildSessionCookieOptions,
  expiredSessionCookieOptionsForDomain,
  sessionCookieOptionsForDomain,
} from './auth';

describe('session cookie protocol', () => {
  it('uses the same base attributes for session creation', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(buildSessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
  });

  it('targets all supported domain variants with consistent attributes', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(sessionCookieOptionsForDomain('host')).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });

    expect(sessionCookieOptionsForDomain('www')).toMatchObject({ domain: 'www.hag-ink.com' });
    expect(sessionCookieOptionsForDomain('apex')).toMatchObject({ domain: 'hag-ink.com' });
    expect(sessionCookieOptionsForDomain('wildcard')).toMatchObject({ domain: '.hag-ink.com' });
  });

  it('expires logout cookies with the exact same scope', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const activeCookie = sessionCookieOptionsForDomain('wildcard');
    const expiredCookie = expiredSessionCookieOptionsForDomain('wildcard');

    expect(expiredCookie).toMatchObject({
      ...activeCookie,
      maxAge: 0,
      domain: '.hag-ink.com',
    });
    expect(expiredCookie.expires).toEqual(new Date(0));
  });
});
