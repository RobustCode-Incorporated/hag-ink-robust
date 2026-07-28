import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, sessionCookieDomainForHost } from '@/lib/auth';

export async function GET(request: Request) {
  const cookieDomain = sessionCookieDomainForHost(new URL(request.url).hostname);
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain: cookieDomain,
  });
  return response;
}
