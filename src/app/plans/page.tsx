"use client";

import { useState } from 'react';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const HAG_INK_PLANS: Plan[] = [
  {
    id: 'STANDARD_ENFANT',
    name: 'Standard Enfant',
    price: 49,
    description: 'Idéal pour les jeunes pousses de Hag-Ink.',
    features: ['1 Coupe par mois', '1 Ticket de Loterie inclus', '5% reversés à la RSE']
  },
  {
    id: 'STANDARD_ADULTE',
    name: 'Standard Adulte',
    price: 89,
    description: 'La formule classique pour un style impeccable.',
    features: ['Coupe & Barbe illimitées', '1 Ticket de Loterie inclus', '5% reversés à la RSE'],
    isPopular: true
  },
  {
    id: 'LIMITED_EDITION',
    name: 'Limited Edition (Artiste)',
    price: 229,
    description: 'L\'expérience ultime VIP de Hag-Ink.',
    features: ['Prestations Premium prioritaires', '2 Tickets de Loterie (Double chance !)', 'Accès événements exclusifs', '5% reversés à la RSE']
  }
];

export default function PlansPage() {
  const [clientId, setClientId] = useState('robust-client-test-id-2026');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleSubscribe = async (planName: string) => {
    setLoadingPlan(planName);
    setError(null);
    setSuccessData(null);

    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, planName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de l\'abonnement.');
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 sm:text-5xl">
            Abonnements Hag-Ink
          </h1>
          <p className="mt-4 text-xl text-slate-400">
            Choisissez la formule taillée pour votre style et financez le changement RSE.
          </p>
        </div>

        {/* Console de Test ROBUST */}
        <div className="max-w-2xl mx-auto bg-slate-900 border border-amber-500/30 rounded-xl p-6 mb-12 shadow-lg shadow-amber-500/5">
          <div className="flex items-center space-x-2 text-amber-400 mb-3 font-semibold text-sm tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Mode Intégration ROBUST</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Pour simuler l'achat, l'application utilise l'identifiant du client injecté par ton script de seed.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
              ID Client Actif (Neon Postgres)
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Ex: user-uuid..."
            />
          </div>
        </div>

        {/* Section Alertes (Erreur / Succès) */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8 bg-red-950/40 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm">
            💥 <span className="font-bold">Erreur Technique :</span> {error}
          </div>
        )}

        {successData && (
          <div className="max-w-3xl mx-auto mb-12 bg-emerald-950/40 border border-emerald-500 rounded-2xl p-6 shadow-xl shadow-emerald-950/20">
            <div className="flex items-center space-x-3 text-emerald-400 font-bold text-xl mb-4">
              <span>🎉 Abonnement Confirmé avec Succès !</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Détails financiers</h3>
                <p className="text-sm">Plan souscrit : <span className="text-white font-semibold">{successData.planName}</span></p>
                <p className="text-sm">Montant facturé : <span className="text-amber-400 font-bold">{successData.pricePaid}$</span></p>
                <p className="text-sm mt-2 text-emerald-400 font-medium">
                  🌱 Contribution RSE (5%) : <span className="underline">{successData.donationAmount}$</span>
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">🎫 Vos Tickets de Loterie (Live 2026)</h3>
                <div className="space-y-1.5">
                  {successData.lotteryTickets?.map((ticket: string, idx: number) => (
                    <div key={idx} className="bg-slate-950 border border-amber-500/20 px-3 py-1.5 rounded font-mono text-xs text-amber-400 flex justify-between items-center">
                      <span>{ticket}</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase font-sans">Actif</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Date d'expiration : {new Date(successData.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grille des tarifs */}
        <div className="mt-4 space-y-4 sm:mt-8 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {HAG_INK_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl shadow-xl flex flex-col overflow-hidden border ${
                plan.isPopular ? 'bg-slate-900 border-amber-500 shadow-amber-500/5' : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="p-6 flex-1">
                {plan.isPopular && (
                  <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500 text-slate-950 mb-4">
                    Le plus populaire
                  </span>
                )}
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-400 min-h-[40px]">{plan.description}</p>
                <p className="mt-4 flex items-baseline text-white">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}$</span>
                  <span className="ml-1 text-xl font-semibold text-slate-400">/mois</span>
                </p>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-300">
                      <span className="text-emerald-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-slate-900/80 border-t border-slate-800">
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold tracking-wide transition-all ${
                    loadingPlan === plan.id
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : plan.isPopular
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {loadingPlan === plan.id ? 'Traitement...' : "S'abonner au plan"}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}