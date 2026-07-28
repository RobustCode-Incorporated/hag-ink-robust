import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CEOProductsPage from './ceo/products/page';
import CEOHrPage from './ceo/hr/page';
import ManagerProductsPage from './manager/products/page';
import ManagerBarbersPage from './manager/coiffeurs/page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CEO workflow', () => {
  it('renders CEO products page and loads products', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: '1', name: 'Gel', sku: 'GEL-1', purchasePrice: 10, sellingPrice: 15, stockQty: 5, isConsumable: true }],
    });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<CEOProductsPage />);

    expect(await screen.findByText('Espace CEO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produits' })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/products');
  });

  it('renders CEO HR page and loads staff lists', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => [] });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<CEOHrPage />);

    expect(await screen.findByText('Espace CEO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ressources Humaines' })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});

describe('Manager workflow', () => {
  it('renders manager products page with Espace manager label', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: '1', name: 'Shampooing', stockQty: 8, isConsumable: true }] });
    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);

    render(<ManagerProductsPage />);
    expect(await screen.findByText('Espace manager')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produits' })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/products');
  });

  it('renders manager coiffeurs page and loads barbers', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => [] });

    vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
    render(<ManagerBarbersPage />);

    expect(await screen.findByText('Espace manager')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coiffeurs' })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/barbers');
  });
});
