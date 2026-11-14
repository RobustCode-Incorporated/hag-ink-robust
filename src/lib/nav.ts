import { SALON } from '@/config/salon';
import type { Role } from '@/lib/session';

export type NavItem = { href: string; label: string; roles: Role[]; feature?: keyof typeof SALON.features };

// Single source for the management menu and page permissions.
export const NAV: NavItem[] = [
  { href: '/gestion', label: 'Tableau de bord', roles: ['OWNER', 'MANAGER'] },
  { href: '/gestion/agenda', label: 'Agenda', roles: ['OWNER', 'MANAGER', 'BARBER'] },
  { href: '/gestion/caisse', label: 'Caisse', roles: ['OWNER', 'MANAGER'] },
  { href: '/gestion/clients', label: 'Clients', roles: ['OWNER', 'MANAGER'] },
  { href: '/gestion/equipe', label: 'Équipe', roles: ['OWNER', 'MANAGER'] },
  { href: '/gestion/salaires', label: 'Salaires', roles: ['OWNER'] },
  { href: '/gestion/depenses', label: 'Dépenses', roles: ['OWNER', 'MANAGER'] },
  { href: '/gestion/produits', label: 'Produits', roles: ['OWNER'] },
  { href: '/gestion/prestations', label: 'Prestations', roles: ['OWNER'] },
  { href: '/gestion/ambassadeurs', label: 'Ambassadeurs', roles: ['OWNER'] },
  { href: '/gestion/robust-si', label: 'Robust SI', roles: ['OWNER'] },
  { href: '/gestion/abonnements', label: 'Abonnements', roles: ['OWNER', 'MANAGER'], feature: 'memberships' },
  { href: '/gestion/tombola', label: 'Tombola', roles: ['OWNER'], feature: 'tombola' },
  { href: '/gestion/reglages', label: 'Réglages', roles: ['OWNER'] },
  { href: '/gestion/moi', label: 'Mon espace', roles: ['OWNER', 'BARBER'] },
];

/** Menu for a role; modules switched off in SALON.features are hidden. */
export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role) && (!n.feature || SALON.features[n.feature]));
