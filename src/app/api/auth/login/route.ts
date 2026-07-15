import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type AuthRole,
  roleHome,
} from '@/lib/auth';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined; pool: pg.Pool | undefined };
if (!globalForPrisma.pool) globalForPrisma.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(globalForPrisma.pool) });
const prisma = globalForPrisma.prisma;

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
    } else {
      const user = await prisma.user.findFirst({
        where: {
          role,
          email: normalizedEmail,
          password: normalizedPassword,
        },
      });
      isValid = Boolean(user);
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
    }

    const token = await createSessionToken({ role, email: normalizedEmail });
    const response = NextResponse.json({ success: true, role, redirectTo: roleHome(role) });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}