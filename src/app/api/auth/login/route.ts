import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { compare, hash } from 'bcryptjs';
import type { Role } from '@/../generated/prisma/client';
import {
  buildSessionCookieOptions,
  createSessionToken,
  SESSION_COOKIE_NAME,
  type AuthRole,
  roleHome,
} from '@/lib/auth';

const PASSWORD_SALT_ROUNDS = 12;


type LoginBody = {
  email: unknown;
  password: unknown;
  role: unknown;
};

type SeedCredentials = {
  email: string;
  password: string;
};

function getEnvManagementCredentials(role: AuthRole): SeedCredentials | null {
  if (role === 'CEO') {
    const email = process.env.CEO_LOGIN_EMAIL?.trim().toLowerCase();
    const password = process.env.CEO_LOGIN_PASSWORD;
    if (!email || !password) return null;
    return { email, password };
  }

  const email = process.env.MANAGER_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MANAGER_LOGIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

async function ensureManagementUser(role: AuthRole, email: string): Promise<void> {
  const credentials = getEnvManagementCredentials(role);
  if (!credentials) return;
  if (credentials.email !== email) return;

  const existingUser = await prisma.user.findFirst({
    where: {
      role,
      email,
    },
    select: { id: true },
  });

  if (existingUser) return;

  await prisma.user.create({
    data: {
      email,
      password: await hash(credentials.password, PASSWORD_SALT_ROUNDS),
      role: role as Role,
    },
  });
}

export async function POST(request: Request) {
  try {
    const { email, password, role } = (await request.json()) as LoginBody;

    if (typeof email !== 'string' || typeof password !== 'string' || (role !== 'CEO' && role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    await ensureManagementUser(role, normalizedEmail);

    const user = await prisma.user.findFirst({
      where: {
        role,
        email: normalizedEmail,
      },
    });

    const isValid = user ? await compare(normalizedPassword, user.password) : false;

    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
    }

    const token = await createSessionToken({ role, email: normalizedEmail });
    const response = NextResponse.json({ success: true, role, redirectTo: roleHome(role) });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...buildSessionCookieOptions(),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}