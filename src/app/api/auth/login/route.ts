import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieDomainForHost,
  type AuthRole,
  roleHome,
} from '@/lib/auth';


type LoginBody = {
  email: unknown;
  password: unknown;
  role: unknown;
};

function getEnvCredentials(role: AuthRole): { email: string; password: string } | null {
  if (role === 'CEO') {
    const email = process.env.CEO_LOGIN_EMAIL;
    const password = process.env.CEO_LOGIN_PASSWORD;
    if (!email || !password) return null;
    return { email, password };
  }

  const email = process.env.MANAGER_LOGIN_EMAIL;
  const password = process.env.MANAGER_LOGIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function POST(request: Request) {
  try {
    const { email, password, role } = (await request.json()) as LoginBody;

    if (typeof email !== 'string' || typeof password !== 'string' || (role !== 'CEO' && role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    let isValid = false;
    const envCredentials = getEnvCredentials(role);
    if (envCredentials) {
      isValid = normalizedEmail === envCredentials.email.trim().toLowerCase() && normalizedPassword === envCredentials.password;
    }

    if (!isValid) {
      const user = await prisma.user.findFirst({
        where: { role, email: normalizedEmail },
      });
      if (user) {
        // Support both bcrypt-hashed passwords and legacy plain-text passwords
        const isHashed = user.password.startsWith('$2');
        isValid = isHashed
          ? await compare(normalizedPassword, user.password)
          : user.password === normalizedPassword;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
    }

    const token = await createSessionToken({ role, email: normalizedEmail });
    const cookieDomain = sessionCookieDomainForHost(new URL(request.url).hostname);
    const response = NextResponse.json({ success: true, role, redirectTo: roleHome(role) });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
      domain: cookieDomain,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}