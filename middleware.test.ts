import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { verifySessionToken } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  isManagementOnlyModeEnabled: () => false,
  roleHome: (role: 'CEO' | 'MANAGER') => (role === 'CEO' ? '/ceo' : '/manager'),
  SESSION_COOKIE_NAME: 'hag_session',
  verifySessionToken: vi.fn(),
}));

describe('middleware auth public routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not redirect POST /api/auth/logout when a session cookie exists', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      role: 'CEO',
      email: 'ceo@example.com',
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'hag_session=token',
      },
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('still redirects authenticated users away from login screens', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({
      role: 'CEO',
      email: 'ceo@example.com',
    } as Awaited<ReturnType<typeof verifySessionToken>>);

    const request = new NextRequest('http://localhost/login/ceo', {
      method: 'GET',
      headers: {
        cookie: 'hag_session=token',
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/ceo');
  });
});
