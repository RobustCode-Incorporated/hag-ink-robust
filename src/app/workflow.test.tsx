import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CEOProductsPage from './ceo/products/page';
import CEOHrPage from './ceo/hr/page';
import ManagerProductsPage from './manager/products/page';
import ManagerBarbersPage from './manager/coiffeurs/page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CEO workflow', () => {
  it('renders CEO products page and submits new product', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: '1', name: 'Gel', sku: 'GEL-1', purchasePrice: 10, sellingPrice: 15, stockQty: 5, isConsumable: true }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '2', name: 'Nouveau Gel', sku: 'NOUVEAU-GEL-1234', purchasePrice: 12, sellingPrice: 20, stockQty: 10, isConsumable: false }) });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<CEOProductsPage />);

    expect(await screen.findByText('Espace CEO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produits' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nom du produit/i), { target: { value: 'Nouveau Gel' } });
    fireEvent.change(screen.getByLabelText(/Prix d’achat/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Prix de vente/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/Quantité en stock/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch.mock.calls[1][0]).toBe('/api/products');
  });

  it('renders CEO HR page and submits a new manager', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'm1', email: 'ceo@example.com', role: 'MANAGER' }) });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<CEOHrPage />);

    expect(await screen.findByText('Espace CEO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ressources Humaines' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Rôle/i), { target: { value: 'MANAGER' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'ceo@example.com' } });
    fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer manager/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(mockFetch.mock.calls[2][0]).toBe('/api/users');
  });
});

describe('Manager workflow', () => {
  it('renders manager products page with Espace manager label', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: '1', name: 'Shampooing', stockQty: 8, isConsumable: true }] });
    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);

    render(<ManagerProductsPage />);
    expect(await screen.findByText('Espace manager')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produits' })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/products');
  });

  it('renders manager coiffeurs page and submits a new barber', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'b1', firstName: 'Jean', lastName: 'Dupont', phone: '0123456789' }) });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<ManagerBarbersPage />);

    expect(await screen.findByText('Espace manager')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coiffeurs' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Prénom/i), { target: { value: 'Jean' } });
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByLabelText(/Téléphone/i), { target: { value: '0123456789' } });
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un barbier/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch.mock.calls[1][0]).toBe('/api/barbers');
  });
});
