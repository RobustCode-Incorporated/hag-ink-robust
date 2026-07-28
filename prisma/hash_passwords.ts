import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hash } from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 12;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est obligatoire pour hasher les mots de passe.');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      password: {
        not: '',
      },
    },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
    },
  });

  const toMigrate = users.filter((user) => !isBcryptHash(user.password));

  if (toMigrate.length === 0) {
    console.log('No plaintext passwords detected. Nothing to migrate.');
    return;
  }

  for (const user of toMigrate) {
    const hashedPassword = await hash(user.password, PASSWORD_SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  console.log(`Password migration complete: ${toMigrate.length} user(s) migrated to bcrypt.`);
}

main()
  .catch((error: unknown) => {
    console.error('Password migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
