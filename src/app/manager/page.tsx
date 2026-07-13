"use client";

import { useState } from 'react';

// Données réelles injectées par le seed pour faciliter les tests de Henock
const BARBERS = [
  { id: 'barber-bilal-id', name: 'Bilal Akuma Soumaré (30%)' },
  { id: 'barber-medy-id', name: 'Medy Tshibwabwa (25%)' },
  { id: 'barber-arnold-id', name: 'Arnold Bopioko Bosondjolo (25%)' },
  { id: 'barber-guyston-id', name: 'Guyston Biango (25%)' },
  { id: 'barber-martins-id', name: 'Martins Lizanga Lobonyo (25%)' },
];

export default function ManagerDashboard() {
  const [managerId] = useState('manager-henock-id-2026'); // ID fixe du seed pour le dev
  const [barberId, setBarberId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Coupe + Barbe classique');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId || !amount) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un barbier et un montant.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          managerId,
          amount: parseFloat(amount),
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Erreur lors de l\'enregistrement.');

      setMessage({ type: 'success', text: `Prestation enregistrée avec succès ! Commission calculée automatiquement.` });
      setAmount('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Espace Gestion Opérationnelle</h1>
            <p className="text-sm text-slate-400 mt-1">Connecté en tant que : <span className="text-amber-400 font-mono">Henock Lubo Lubo (Manager)</span></p>
          </div>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Flux Live 2026
          </span>
        </div>

        {/* Grille Principale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulaire d'encaissement */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              💈 Enregistrer une Prestation
            </h2>
            
            {message && (
              <div className={`p-4 rounded-lg text-sm mb-6 ${message.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500 text-emerald-200' : 'bg-red-950/40 border border-red-500 text-red-200'}`}>
                {message.type === 'success' ? '✅' : '💥'} {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Barbier ayant réalisé la coupe</label>
                <select
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choisir un membre de l'équipe --</option>
                  {BARBERS.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Montant encaissé ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Type de service / Détails</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl hover:bg-amber-400 transition-colors disabled:bg-slate-800 disabled:text-slate-500 text-sm tracking-wide"
              >
                {loading ? 'Validation en cours...' : 'Valider et Encaisser'}
              </button>
            </form>
          </div>

          {/* Raccourcis & Infos annexes */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">Rappel Règles Métier</h3>
              <ul className="text-xs text-slate-400 space-y-2.5">
                <li className="flex items-start">
                  <span className="text-amber-500 mr-1.5">•</span>
                  Chaque enregistrement calcule instantanément la part du barbier en fonction de son contrat.
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-1.5">•</span>
                  Les rapports financiers consolidés sont envoyés directement sur le bureau virtuel de Haggi.
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}