import { NextRequest, NextResponse } from 'next/server';
import {
  isManagementOnlyModeEnabled,
  roleHome,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type AuthRole,
} from '@/lib/auth';

const CLIENT_BLOCKED_PREFIXES = ['/client', '/plans', '/api/payments', '/api/subscriptions', '/api/appointments'];
const SHARED_MANAGEMENT_API_PREFIXES = ['/api/services', '/api/expenses', '/api/barbers', '/api/cleaners', '/api/products', '/api/users'];
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
  return startsWithPath(pathname, '/login') || pathname === '/api/auth/login' || pathname === '/api/auth/logout';
}

function requiresAuth(pathname: string): boolean {
  if (pathname === '/') return true;
  if (startsWithPath(pathname, '/ceo') || startsWithPath(pathname, '/manager')) return true;
  if (startsWithPath(pathname, '/api/ceo') || startsWithPath(pathname, '/api/manager')) return true;
  return SHARED_MANAGEMENT_API_PREFIXES.some((prefix) => startsWithPath(pathname, prefix));
}

function requiredRoleForPath(pathname: string): AuthRole | null {
  if (pathname === '/' || startsWithPath(pathname, '/ceo') || startsWithPath(pathname, '/api/ceo')) return 'CEO';
  if (startsWithPath(pathname, '/manager') || startsWithPath(pathname, '/api/manager')) return 'MANAGER';
  return null;
}

function loginPathForRequest(pathname: string): string {
  const role = requiredRoleForPath(pathname);
  if (role === 'CEO') return '/login/ceo';
  if (role === 'MANAGER') return '/login/manager';
  return '/login';
}

function unauthorizedApi(message: string, status = 401): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  const normalizedHostname = hostname.toLowerCase();

  if (pathname === '/' && CUSTOM_DOMAIN_HOSTS.has(normalizedHostname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const target = isManagementOnlyModeEnabled() ? '/login' : '/client';
      return NextResponse.redirect(new URL(target, request.url));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0 });
      return response;
    }

    return NextResponse.redirect(new URL(roleHome(session.role), request.url));
  }

  if (isManagementOnlyModeEnabled() && CLIENT_BLOCKED_PREFIXES.some((prefix) => startsWithPath(pathname, prefix))) {
    if (isApiRoute(pathname)) return unauthorizedApi('Public client APIs are disabled in management-only mode.', 503);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.next();

    const session = await verifySessionToken(token);
    if (!session) return NextResponse.next();
    return NextResponse.redirect(new URL(roleHome(session.role), request.url));
  }

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
    response.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0 });
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
