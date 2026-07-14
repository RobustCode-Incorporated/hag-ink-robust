"use client";

import { useEffect, useState } from 'react';

type Product = { id: string; name: string; stockQty: number; isConsumable: boolean };

export default function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) setProducts(await res.json());
      } catch (e) {
        setProducts(null);
      }
    })();
  }, []);

  return (
    <div className="p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace manager</p>
      <h1 className="text-2xl font-black mb-4">Produits</h1>
      <p className="text-sm text-slate-500 mb-6">Outils opérationnels: niveaux de stock, alertes, et consommation par prestation.</p>

      <section className="rounded-lg border bg-white p-4 mb-6">
        <h2 className="font-semibold">Ruptures et alertes</h2>
        <div className="mt-4">
          {products ? (
            <ul className="space-y-2">
              {products.filter(p => p.stockQty <= 5).map(p => (
                <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="text-red-600 font-bold">{p.stockQty}</span></li>
              ))}
              {products.filter(p => p.stockQty <= 5).length === 0 && <li className="text-sm text-slate-500">Aucune alerte de stock.</li>}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Données produit non disponibles. Connecter `/api/products`.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Catalogue</h2>
        <div className="mt-4">
          {products && products.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr><th>Produit</th><th>Stock</th><th>Type</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t"><td className="py-2">{p.name}</td><td className="py-2 font-bold">{p.stockQty}</td><td className="py-2">{p.isConsumable ? 'Consommable' : 'Vente'}</td></tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">Données produit non disponibles. Connecter `/api/products`.</p>
          )}
        </div>
      </section>
    </div>
  );
}
