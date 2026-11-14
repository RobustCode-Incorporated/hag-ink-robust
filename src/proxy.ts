import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE, verifySession } from './lib/session';

const intl = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/gestion')) {
    // Optimistic check only; pages re-check the role server-side (src/lib/auth.ts).
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (pathname === '/gestion/login') {
      return session ? NextResponse.redirect(new URL('/gestion', request.url)) : NextResponse.next();
    }
    if (!session) return NextResponse.redirect(new URL('/gestion/login', request.url));
    return NextResponse.next();
  }

  return intl(request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
