import { NextRequest, NextResponse } from 'next/server';
import {
  roleHome,
  SESSION_COOKIE_NAME,
  sessionCookieDomainForHost,
  verifySessionToken,
  type AuthRole,
} from '@/lib/auth';

const MANAGEMENT_API_PREFIXES = ['/api/services', '/api/expenses', '/api/barbers', '/api/cleaners', '/api/products', '/api/users'];
const CUSTOM_DOMAIN_HOSTS = new Set(
  [process.env.NEXT_PUBLIC_CUSTOM_DOMAIN, 'www.hag-ink.com', 'hag-ink.com']
    .map((host) => host?.trim().toLowerCase())
    .filter((host): host is string => Boolean(host))
);

function startsWithPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isPublicRoute(pathname: string): boolean {
  // /client and /login are public — no auth required
  return (
    startsWithPath(pathname, '/client') ||
    startsWithPath(pathname, '/login') ||
    pathname === '/logout' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    startsWithPath(pathname, '/api/payments') ||
    startsWithPath(pathname, '/api/subscriptions')
  );
}

function requiresAuth(pathname: string): boolean {
  if (startsWithPath(pathname, '/ceo') || startsWithPath(pathname, '/manager')) return true;
  if (startsWithPath(pathname, '/api/ceo') || startsWithPath(pathname, '/api/manager')) return true;
  return MANAGEMENT_API_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

function requiredRoleForPath(pathname: string): AuthRole | null {
  if (startsWithPath(pathname, '/ceo') || startsWithPath(pathname, '/api/ceo')) return 'CEO';
  if (startsWithPath(pathname, '/manager') || startsWithPath(pathname, '/api/manager')) return 'MANAGER';
  return null;
}

function loginPathForRequest(pathname: string): string {
  const role = requiredRoleForPath(pathname);
  if (role === 'CEO') return '/login';
  if (role === 'MANAGER') return '/login';
  return '/login';
}

function unauthorizedApi(message: string, status = 401): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  const normalizedHostname = hostname.toLowerCase();

  // Root "/" → always redirect to the client portal
  if (pathname === '/') {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        // Authenticated CEO/Manager: send to their portal
        return NextResponse.redirect(new URL(roleHome(session.role), request.url));
      }
      // Invalid token: clear it and go to client portal
      const response = NextResponse.redirect(new URL('/client', request.url));
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        path: '/',
        maxAge: 0,
        domain: sessionCookieDomainForHost(normalizedHostname),
      });
      return response;
    }
    return NextResponse.redirect(new URL('/client', request.url));
  }

  // Public routes: pass through (no auth check)
  if (isPublicRoute(pathname)) {
    if (pathname === '/logout') return NextResponse.next();

    // On login page: if already authenticated, redirect to the right portal
    if (startsWithPath(pathname, '/login')) {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (!token) return NextResponse.next();
      const session = await verifySessionToken(token);
      if (!session) return NextResponse.next();
      return NextResponse.redirect(new URL(roleHome(session.role), request.url));
    }

    return NextResponse.next();
  }

  // Protected management routes
  if (!requiresAuth(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    if (isApiRoute(pathname)) return unauthorizedApi('Authentication required.');
    return NextResponse.redirect(new URL(loginPathForRequest(pathname), request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    if (isApiRoute(pathname)) return unauthorizedApi('Invalid session.');
    const response = NextResponse.redirect(new URL(loginPathForRequest(pathname), request.url));
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
      domain: sessionCookieDomainForHost(normalizedHostname),
    });
    return response;
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (requiredRole && requiredRole !== session.role) {
    if (isApiRoute(pathname)) return unauthorizedApi('Insufficient permissions.', 403);
    return NextResponse.redirect(new URL(roleHome(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
