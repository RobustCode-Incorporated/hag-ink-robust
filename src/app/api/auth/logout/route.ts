import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

type CookieDomainVariant = 'host' | 'www' | 'apex' | 'wildcard';

function clearSessionCookie(response: NextResponse, domainVariant: CookieDomainVariant = 'host') {
  const cookieOptions: {
    name: string;
    value: string;
    path: string;
    maxAge: number;
    expires: Date;
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    domain?: string;
  } = {
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  if (domainVariant === 'www') cookieOptions.domain = 'www.hag-ink.com';
  if (domainVariant === 'apex') cookieOptions.domain = 'hag-ink.com';
  if (domainVariant === 'wildcard') cookieOptions.domain = '.hag-ink.com';

  response.cookies.set(cookieOptions);
}

function clearAllSessionCookieVariants(response: NextResponse) {
  clearSessionCookie(response, 'host');
  clearSessionCookie(response, 'www');
  clearSessionCookie(response, 'apex');
  clearSessionCookie(response, 'wildcard');
}

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true, redirectTo: '/login' });
  clearAllSessionCookieVariants(response);

  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get('redirect') === '1') {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url), 303);
    clearAllSessionCookieVariants(redirectResponse);
    return redirectResponse;
  }

  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  clearAllSessionCookieVariants(response);
  return response;
}
