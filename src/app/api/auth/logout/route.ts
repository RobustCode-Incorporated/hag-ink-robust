import { NextResponse } from 'next/server';
import { expiredSessionCookieOptionsForDomain, SESSION_COOKIE_NAME } from '@/lib/auth';

function clearSessionCookie(response: NextResponse, domainVariant: Parameters<typeof expiredSessionCookieOptionsForDomain>[0] = 'host') {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    ...expiredSessionCookieOptionsForDomain(domainVariant),
  });
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
