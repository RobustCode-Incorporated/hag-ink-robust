import { defineConfig } from '@prisma/config';
import fs from 'fs';
import path from 'path';

// Rigueur ROBUST : Extraction native du .env si process.env n'est pas encore peuplé
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?$/m);
      if (match && match[1]) {
        process.env.DATABASE_URL = match[1].trim();
      }
    }
  } catch (error) {
    console.error("⚠️ [ROBUST CONFIG] Impossible de lire le fichier .env local :", error);
  }
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // Spécifique à Prisma 7 : Déclaration de la commande de seed ici
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
});