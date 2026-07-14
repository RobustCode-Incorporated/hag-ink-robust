"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  isConsumable: boolean;
};

export default function CEOProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productName, setProductName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [stockQty, setStockQty] = useState('0');
  const [isConsumable, setIsConsumable] = useState(false);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
      else setProducts(null);
    } catch {
      setProducts(null);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const totalStockValue = useMemo(
    () => products?.reduce((sum, product) => sum + product.stockQty * product.purchasePrice, 0) ?? 0,
    [products],
  );

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProduct(true);
    setProductMessage(null);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          purchasePrice: Number(purchasePrice),
          sellingPrice: Number(sellingPrice),
          stockQty: Number(stockQty),
          isConsumable,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de créer le produit.');

      setProductMessage('Produit créé avec succès.');
      setProductName('');
      setPurchasePrice('0');
      setSellingPrice('0');
      setStockQty('0');
      setIsConsumable(false);
      await loadProducts();
    } catch (error) {
      setProductMessage(error instanceof Error ? error.message : 'Erreur serveur.');
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO</p>
        <h1 className="text-2xl font-black mb-2">Produits</h1>
        <p className="text-sm text-slate-500">Analyse produit: valorisation du stock, top sellers, et création de nouveaux produits.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Valeur du stock</p>
          <p className="text-xl font-bold mt-2">€{totalStockValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Articles en stock</p>
          <p className="text-xl font-bold mt-2">{products ? products.length : '—'}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Consommables</p>
          <p className="text-xl font-bold mt-2">{products ? products.filter((p) => p.isConsumable).length : '—'}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mb-6">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Ajouter un produit</h2>
          <form onSubmit={createProduct} className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Nom du produit
              <input required value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Prix d’achat
                <input required type="number" step="0.01" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
              </label>
              <label className="block text-sm font-medium">
                Prix de vente
                <input required type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Quantité en stock
                <input required type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={isConsumable} onChange={(e) => setIsConsumable(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-slate-950" />
                Produit consommable
              </label>
            </div>
            {productMessage && <p className="text-sm text-slate-600">{productMessage}</p>}
            <button disabled={savingProduct} className="mt-2 w-full rounded-lg bg-slate-950 p-3 text-white font-bold disabled:opacity-60">
              {savingProduct ? 'Création en cours…' : 'Créer le produit'}
            </button>
          </form>
        </section>

      </div>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Top produits (par quantité)</h2>
        <div className="mt-4">
          {loadingProducts ? (
            <p className="text-sm text-slate-500">Chargement des produits...</p>
          ) : products && products.length > 0 ? (
            <ul className="space-y-2">
              {products
                .slice()
                .sort((a, b) => b.stockQty - a.stockQty)
                .slice(0, 10)
                .map((product) => (
                  <li key={product.id} className="flex justify-between">
                    <span>{product.name}</span>
                    <span className="font-bold">{product.stockQty}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Données produit non disponibles. Connecter `/api/products`.</p>
          )}
        </div>
      </section>
    </div>
  );
}
