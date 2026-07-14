"use client";

import { FormEvent, useEffect, useState } from 'react';

type Dashboard = {
  kpi: { todayRevenue: number; todayServices: number; activeBarbers: number; totalExpenses: number; netRevenue: number };
  barbers: Array<{ id: string; name: string; todayRevenue: number }>;
  recentServices: Array<{ id: string; amount: number; createdAt: string; barber: string }>;
  expenses?: Array<{ id: string; amount: number; description: string; createdAt: string; user: string }>;
  analytics?: {
    lowStockItems: number;
    consumablesUsedThisWeek: number;
    activeStockPlans: number;
    planFulfillmentPercent: number;
  };
};

export default function ManagerDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [barberId, setBarberId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  const load = async () => {
    const response = await fetch('/api/manager/dashboard');
    if (response.ok) setDashboard(await response.json());
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, amount: Number(amount), description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Erreur serveur');

      setAmount('');
      setDescription('');
      setMessage('Prestation enregistrée.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setExpenseSaving(true);
    setExpenseMessage(null);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(expenseAmount), description: expenseDescription, role: 'MANAGER' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Erreur serveur');

      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseMessage('Dépense bien enregistrée.');
      await load();
    } catch (error) {
      setExpenseMessage(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setExpenseSaving(false);
    }
  };

  const currency = (value: number) => `$${value.toLocaleString()}`;

  return <div className="min-h-screen bg-slate-50 p-8 text-slate-900"><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace manager</p><h1 className="text-3xl font-black">Vue d'ensemble</h1></div><p className="text-sm text-slate-500">Suivi des prestations du jour et analytics stock/plans.</p></div>
    <div className="mb-8 grid gap-6 md:grid-cols-5">{[['CA aujourd’hui', currency(dashboard?.kpi.todayRevenue ?? 0)], ['Prestations', String(dashboard?.kpi.todayServices ?? 0)], ['Barbiers actifs', String(dashboard?.kpi.activeBarbers ?? 0)], ['Dépenses', currency(dashboard?.kpi.totalExpenses ?? 0)], ['Revenu net', currency(dashboard?.kpi.netRevenue ?? 0)]].map(([title, value]) => <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase text-slate-400">{title}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>
    <section className="rounded-2xl border bg-white p-6 shadow-sm mb-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <div>
          <h2 className="text-xl font-bold">Dépenses du jour</h2>
          <p className="mt-2 text-sm text-slate-500">Dernières dépenses enregistrées pour la journée en cours.</p>
        </div>
        <form onSubmit={submitExpense} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Signaler une dépense</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">Montant ($)<input required min="0.01" step="0.01" type="number" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} className="mt-2 w-full rounded-lg border p-3" /></label>
            <label className="block text-sm font-medium">Description<textarea required value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} className="mt-2 w-full rounded-lg border p-3" rows={3} /></label>
          </div>
          <button disabled={expenseSaving} type="submit" className="mt-4 w-full rounded-lg bg-slate-950 p-3 font-bold text-white disabled:opacity-60">{expenseSaving ? 'Enregistrement…' : 'Reporter la dépense'}</button>
          {expenseMessage && <p className="mt-3 text-sm text-slate-600">{expenseMessage}</p>}
        </form>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b text-slate-500">
            <tr>
              <th className="py-3 uppercase">Montant</th>
              <th className="py-3 uppercase">Description</th>
              <th className="py-3 uppercase">Date</th>
              <th className="py-3 uppercase">Saisi par</th>
            </tr>
          </thead>
          <tbody>
            {dashboard?.expenses?.length ? dashboard.expenses.map((expense) => (
              <tr key={expense.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                <td className="py-3 font-semibold">{currency(expense.amount)}</td>
                <td className="py-3 text-slate-600">{expense.description}</td>
                <td className="py-3 text-slate-500">{new Date(expense.createdAt).toLocaleTimeString('fr-FR')}</td>
                <td className="py-3 text-slate-500">{expense.user}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="py-4 text-slate-500">Aucune dépense enregistrée aujourd'hui.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    <div className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><form onSubmit={submit} className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-bold">Enregistrer une prestation</h2><p className="mt-1 text-sm text-slate-500">Sélectionnez le barbier, le montant et ajoutez une description pour capturer correctement la prestation.</p><label className="mt-6 block text-sm font-medium">Barbier<select required value={barberId} onChange={(event) => setBarberId(event.target.value)} className="mt-2 w-full rounded-lg border p-3"><option value="">Sélectionner</option>{dashboard?.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Montant ($)<input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-lg border p-3" /></label><label className="mt-4 block text-sm font-medium">Description<textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-lg border p-3" rows={4} placeholder="Ex. Coupe + barbe, couleur, retouche..." /></label>{message && <p className="mt-4 text-sm text-slate-600">{message}</p>}<button disabled={saving} className="mt-6 w-full rounded-lg bg-slate-950 p-3 font-bold text-white disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></form>
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-bold">Stock & plans — analytics manager</h2><p className="mt-1 text-sm text-slate-500">Cette section doit aider le manager à suivre l’état des stocks et la gestion des plans de service.</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['Articles en rupture de stock', String(dashboard?.analytics?.lowStockItems ?? '—')], ['Consommables utilisés cette semaine', String(dashboard?.analytics?.consumablesUsedThisWeek ?? '—')], ['Plans actifs', String(dashboard?.analytics?.activeStockPlans ?? '—')], ['Taux de couverture des plans', dashboard?.analytics?.planFulfillmentPercent !== undefined ? `${dashboard.analytics.planFulfillmentPercent}%` : '—']].map(([title, value]) => <div key={title} className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs uppercase tracking-widest text-slate-400">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)} </div><div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-sm font-semibold">Prochaine étape</p><p className="mt-2 text-sm leading-6">Connecter les données de <code>Product.stockQty</code>, <code>ServiceProduct</code> et <code>Plan</code> pour afficher les alertes de stock, la consommation de produits par prestation, et le niveau de réalisation des plans de service.</p></div></section></div>
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-bold">Performance des barbiers — aujourd’hui</h2><div className="mt-5 space-y-4">{dashboard?.barbers.map((barber) => <div key={barber.id} className="flex items-center justify-between border-b pb-4 last:border-0"><div><p className="font-medium">{barber.name}</p></div><p className="font-bold">{currency(barber.todayRevenue)}</p></div>)}</div></section>
    <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-bold">Dernières prestations</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="pb-3">Barbier</th><th className="pb-3">Date</th><th className="pb-3">Montant</th></tr></thead><tbody>{dashboard?.recentServices.map((service) => <tr key={service.id} className="border-t"><td className="py-3">{service.barber}</td><td className="py-3 text-slate-500">{new Date(service.createdAt).toLocaleString('fr-FR')}</td><td className="py-3 font-bold">{currency(service.amount)}</td></tr>)}</tbody></table></div></section>
  </div></div>;
}
