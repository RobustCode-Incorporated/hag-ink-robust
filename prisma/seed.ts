import { PrismaClient, Role, ProductType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Rigueur ROBUST : Extraction native du .env pour le processus isolé du script de Seed
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.startsWith('DATABASE_URL')) {
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex !== -1) {
            let value = trimmed.substring(equalIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            process.env.DATABASE_URL = value;
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error("⚠️ [SEED] Erreur lors du chargement manuel du fichier .env :", error);
  }
}

// Nouvelle norme de sécurité Prisma 7 : Initialisation via le Driver Adapter
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Début du nettoyage et du seeding de Neon Postgres avec les vraies données Hag-Ink...');

  // 1. Nettoyage des tables dans l'ordre inverse des clés étrangères
  await prisma.subscription.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barberProfile.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();

  console.log('🗑️ Base de données nettoyée avec succès.');

  // 2. Création du Grand Chef / CEO (Haggi Amirally)
  await prisma.user.create({
    data: {
      firstName: 'Haggi',
      lastName: 'Amirally',
      email: 'hagikibwe@hotmail.fr',
      phone: '+1 (817) 770-7517',
      role: Role.MANAGER,
    },
  });
  console.log(`👑 CEO Haggi Amirally enregistré.`);

  // 3. Création du Staff de Gestion et Entretien (Salaires Fixes)
  await prisma.user.create({
    data: {
      firstName: 'Henock',
      lastName: 'Lubo Lubo',
      email: 'Henocklubo4@gmail.com',
      phone: '+243892295550',
      role: Role.MANAGER,
    },
  });
  console.log(`💼 Manager Henock Lubo Lubo enregistré.`);

  await prisma.user.create({
    data: {
      firstName: 'Victor',
      lastName: 'Mulamba Abedi',
      email: 'MulambaVictor@icloud.com',
      phone: '+243826196685',
      role: Role.CLEANER,
    },
  });
  console.log(`🧹 Nettoyeur Victor Mulamba Abedi enregistré.`);

  // 4. Création des Barbiers avec leurs règles de commission exactes
  const barbersData = [
    { firstName: 'Bilal Akuma', lastName: 'Soumaré', email: 'romeoalebona62@gmail.com', phone: '+243824625123', commission: 0.30 },
    { firstName: 'Medy', lastName: 'Tshibwabwa', email: 'Medytshibwabwa66@gmail.com', phone: '+243973461975', commission: 0.25 },
    { firstName: 'Arnold', lastName: 'Bopioko Bosondjolo', email: 'bopiokoarnold01@icloud.com', phone: '+243999617283', commission: 0.25 },
    { firstName: 'Guyston', lastName: 'Biango', email: 'Biangogustonne@icloud.com', phone: '+243976327994', commission: 0.25 },
    { firstName: 'Martins', lastName: 'Lizanga Lobonyo', email: 'Martinslizanga215@gmail.com', phone: '+243820355020', commission: 0.25 },
  ];

  for (const b of barbersData) {
    const barberUser = await prisma.user.create({
      data: {
        firstName: b.firstName,
        lastName: b.lastName,
        email: b.email,
        phone: b.phone,
        role: Role.BARBER,
      },
    });

    await prisma.barberProfile.create({
      data: {
        userId: barberUser.id,
        commissionRate: b.commission,
        isFixedSalary: false,
      },
    });
    console.log(`💈 Barbier ${b.firstName} ${b.lastName} injecté (Commission: ${b.commission * 100}%).`);
  }

  // 5. Création de ton profil Client de Test (Idéal pour valider l'UI)
  await prisma.user.create({
    data: {
      id: 'robust-client-test-id-2026',
      firstName: 'Jean-Luc',
      lastName: 'Luzemban',
      email: 'jeanluc.luz@robustcode.com',
      phone: '+243000000000',
      role: Role.CLIENT,
    },
  });

  // 6. Stocks initiaux de produits de soins Hag-Ink
  await prisma.product.createMany({
    data: [
      { name: 'Gel Sculptant Strong Hag-Ink', type: ProductType.TO_SELL, priceBought: 12, priceSold: 25, stock: 40 },
      { name: 'Huile de Soin Hydratante Premium', type: ProductType.TO_SELL, priceBought: 18, priceSold: 40, stock: 25 },
      { name: 'Shampoing Purifiant Professionnel', type: ProductType.TO_USE, priceBought: 9, stock: 15 },
    ],
  });

  console.log('📦 Catalogue de produits de soins configuré.');
  console.log('\n✨ [ROBUST ENGINE] Base de données Neon synchronisée via Driver Adapter avec succès !');
  console.log('======================================================================');
  console.log('🚀 IDENTIFIANT DE TEST POUR TON FRONTEND :');
  console.log(`👉 robust-client-test-id-2026`);
  console.log('======================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Échec critique lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Fermeture propre du pool PostgreSQL
  });