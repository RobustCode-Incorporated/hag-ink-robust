import type { AuthRole } from '@/lib/auth';

export type ManagementNavItem = {
  id: string;
  label: string;
  href: string;
};

const CEO_MENU: ManagementNavItem[] = [
  { id: 'home', label: 'Accueil', href: '/ceo' },
  { id: 'products', label: 'Produits', href: '/ceo/products' },
  { id: 'hr', label: 'Ressources Humaines', href: '/ceo/hr' },
  { id: 'lottery', label: 'Tombola', href: '/ceo/lottery' },
  { id: 'treasury', label: 'Tresorerie & Salaires', href: '/ceo/treasury' },
  { id: 'expenses', label: 'Depenses', href: '/ceo/depenses' },
  { id: 'robust', label: 'ROBUST IA', href: '/ceo/robust' },
];

const MANAGER_MENU: ManagementNavItem[] = [
  { id: 'home', label: 'Accueil', href: '/manager' },
  { id: 'products', label: 'Produits', href: '/manager/products' },
  { id: 'barbers', label: 'Coiffeurs', href: '/manager/coiffeurs' },
  { id: 'expenses', label: 'Depenses', href: '/manager/depenses' },
  { id: 'robust', label: 'ROBUST IA', href: '/manager/robust' },
];

export function managementRoleFromPath(pathname: string | null | undefined): AuthRole | null {
  if (!pathname) return null;
  if (pathname === '/' || pathname.startsWith('/ceo')) return 'CEO';
  if (pathname.startsWith('/manager')) return 'MANAGER';
  return null;
}

export function managementMenuByRole(role: AuthRole): ManagementNavItem[] {
  return role === 'CEO' ? CEO_MENU : MANAGER_MENU;
}