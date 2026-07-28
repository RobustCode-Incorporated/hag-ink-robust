import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ManagementNav from './ManagementNav';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('ManagementNav integration', () => {
  it('renders logout as a non-submit button', () => {
    render(<ManagementNav role="CEO" onLogout={() => undefined} />);

    const logoutButton = screen.getByRole('button', { name: 'Deconnexion' });
    expect(logoutButton).toHaveAttribute('type', 'button');
  });

  it('opens the exact CEO destinations on each tab click', () => {
    render(<ManagementNav role="CEO" onLogout={() => undefined} />);

    const expectedLinks = [
      { label: 'Accueil', href: '/ceo' },
      { label: 'Produits', href: '/ceo/products' },
      { label: 'Ressources Humaines', href: '/ceo/hr' },
      { label: 'Tombola', href: '/ceo/lottery' },
      { label: 'Tresorerie & Salaires', href: '/ceo/treasury' },
      { label: 'Depenses', href: '/ceo/depenses' },
      { label: 'ROBUST IA', href: '/ceo/robust' },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByRole('link', { name: label });
      fireEvent.click(link);
      expect(link).toHaveAttribute('href', href);
    });
  });

  it('opens the exact manager destinations on each tab click', () => {
    render(<ManagementNav role="MANAGER" onLogout={() => undefined} />);

    const expectedLinks = [
      { label: 'Accueil', href: '/manager' },
      { label: 'Produits', href: '/manager/products' },
      { label: 'Coiffeurs', href: '/manager/coiffeurs' },
      { label: 'Depenses', href: '/manager/depenses' },
      { label: 'ROBUST IA', href: '/manager/robust' },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByRole('link', { name: label });
      fireEvent.click(link);
      expect(link).toHaveAttribute('href', href);
    });

    expect(screen.queryByRole('link', { name: 'Tombola' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ressources Humaines' })).not.toBeInTheDocument();
  });
});