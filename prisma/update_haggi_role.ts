import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';

// Charge les variables d'environnement du fichier .env
dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const HAGGI_ID = '86b21e1b-2c12-47db-8a60-dabeeaeba7fb';

  try {
    console.log("Tentative de connexion à :", process.env.DATABASE_URL ? "URL trouvée" : "URL MANQUANTE !");
    
    const updatedUser = await prisma.user.update({
      where: { id: HAGGI_ID },
      data: { role: 'CEO' },
    });

    console.log(`✅ Rôle mis à jour avec succès pour : ${updatedUser.email}`);
    console.log(`Nouveau rôle : ${updatedUser.role}`);
  } catch (error) {
    console.error("❌ Erreur critique :", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();