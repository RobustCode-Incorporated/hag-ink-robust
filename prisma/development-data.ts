import type { PlanName } from '../src/domains/subscription/subscribe';

export const DEVELOPMENT_CLIENT = {
  id: 'robust-client-test-id-2026',
  firstName: 'Jean-Luc',
  lastName: 'Luzemban',
  phone: '+243000000000',
  email: 'jeanluc.luz@robustcode.dev',
};

export const DEVELOPMENT_PLANS: Array<{
  id: string;
  name: PlanName;
  price: number;
  durationDays: number;
  features: string[];
}> = [
  { id: 'plan-standard-enfant', name: 'STANDARD_ENFANT', price: 49, durationDays: 30, features: ['Jusqu’à 5 coiffures', '1 ticket de loterie'] },
  { id: 'plan-standard-adulte', name: 'STANDARD_ADULTE', price: 89, durationDays: 30, features: ['Coupe et barbe', '1 ticket de loterie'] },
  { id: 'plan-braids-a', name: 'BRAIDS_A', price: 89, durationDays: 30, features: ['Tresses classiques', '1 ticket de loterie'] },
  { id: 'plan-braids-b', name: 'BRAIDS_B', price: 189, durationDays: 30, features: ['Tresses premium', '1 ticket de loterie'] },
  { id: 'plan-locks-a', name: 'LOCKS_A', price: 209, durationDays: 30, features: ['Entretien locks', '1 ticket de loterie'] },
  { id: 'plan-locks-b', name: 'LOCKS_B', price: 329, durationDays: 30, features: ['Locks premium', '1 ticket de loterie'] },
  { id: 'plan-limited-edition', name: 'LIMITED_EDITION', price: 229, durationDays: 30, features: ['Priorité VIP', '2 tickets de loterie'] },
];

export const DEVELOPMENT_BARBERS = [
  { id: 'barber-bilal-id', firstName: 'Bilal Akuma', lastName: 'Soumaré', phone: '+243824625123', commissionRate: 0.3 },
  { id: 'barber-medy-id', firstName: 'Medy', lastName: 'Tshibwabwa', phone: '+243973461975', commissionRate: 0.25 },
  { id: 'barber-arnold-id', firstName: 'Arnold', lastName: 'Bopioko Bosondjolo', phone: '+243999617283', commissionRate: 0.25 },
  { id: 'barber-guyston-id', firstName: 'Guyston', lastName: 'Biango', phone: '+243976327994', commissionRate: 0.25 },
  { id: 'barber-martins-id', firstName: 'Martins', lastName: 'Lizanga Lobonyo', phone: '+243820355020', commissionRate: 0.25 },
];

export const DEVELOPMENT_SERVICES = [
  { id: 'seed-service-001', barberId: 'barber-bilal-id', amount: 150, createdAt: new Date('2026-07-01T10:00:00.000Z') },
  { id: 'seed-service-002', barberId: 'barber-bilal-id', amount: 70, createdAt: new Date('2026-07-03T14:00:00.000Z') },
  { id: 'seed-service-003', barberId: 'barber-medy-id', amount: 40, createdAt: new Date('2026-07-05T09:00:00.000Z') },
  { id: 'seed-service-004', barberId: 'barber-arnold-id', amount: 100, createdAt: new Date('2026-07-08T11:00:00.000Z') },
  { id: 'seed-service-005', barberId: 'barber-guyston-id', amount: 85, createdAt: new Date('2026-07-10T16:00:00.000Z') },
  { id: 'seed-service-006', barberId: 'barber-martins-id', amount: 65, createdAt: new Date('2026-07-12T13:00:00.000Z') },
];

export const DEVELOPMENT_EXPENSES = [
  { id: 'seed-expense-001', description: 'Produits et consommables de démonstration', amount: 95, createdAt: new Date('2026-07-02T08:00:00.000Z') },
  { id: 'seed-expense-002', description: 'Entretien du local de démonstration', amount: 45, createdAt: new Date('2026-07-09T08:00:00.000Z') },
];
