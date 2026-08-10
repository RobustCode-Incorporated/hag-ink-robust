import { defineConfig } from '@prisma/config';
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const databaseMatch = envContent.match(/^DATABASE_URL=["']?(.+?)["']?$/m);
      if (databaseMatch && databaseMatch[1]) {
        process.env.DATABASE_URL = databaseMatch[1].trim();
      }
    }
  } catch (error) {
    console.error('⚠️ [ROBUST CONFIG] Impossible de lire le fichier .env local :', error);
  }
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
});
