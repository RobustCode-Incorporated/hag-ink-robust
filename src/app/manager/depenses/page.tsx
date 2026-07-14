"use client";

import { FormEvent, useEffect, useState } from 'react';

type Expense = {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  user: string;
};

type ManagerExpensesData = {
  kpi: { totalExpenses: number; totalCount: number };
  expenses: Expense[];
};

export default function ManagerExpensesPage() {
  const [data, setData] = useState<ManagerExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/manager/depenses?period=${period}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Erreur serveur');

      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseMessage('Dépense bien enregistrée.');
      setLoading(true);
      fetch(`/api/manager/depenses?period=${period}`)
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    } catch (error) {
      setExpenseMessage(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setExpenseSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace manager</p>
            <h1 className="text-3xl font-black">Dépenses</h1>
          </div>
          <select
            className="rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">Toutes les dépenses</option>
            <option value="month">30 derniers jours</option>
            <option value="week">7 derniers jours</option>
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-slate-400">KPI Dépenses</p>
            <p className="mt-2 text-3xl font-black">${data?.kpi.totalExpenses.toLocaleString() ?? 0}</p>
            <p className="mt-2 text-sm text-slate-500">{data?.kpi.totalCount ?? 0} dépense(s) dans la période.</p>
          </div>
          <form onSubmit={submitExpense} className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-slate-400">Signaler une dépense</p>
            <div className="mt-4 grid gap-4">
              <label className="block text-sm font-medium">Montant ($)
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
              <label className="block text-sm font-medium">Description
                <textarea
                  required
                  value={expenseDescription}
                  onChange={(event) => setExpenseDescription(event.target.value)}
                  className="mt-2 w-full rounded-lg border p-3"
                  rows={3}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={expenseSaving}
              className="mt-4 w-full rounded-lg bg-slate-950 p-3 font-bold text-white disabled:opacity-60"
            >
              {expenseSaving ? 'Enregistrement…' : 'Reporter la dépense'}
            </button>
            {expenseMessage && <p className="mt-3 text-sm text-slate-600">{expenseMessage}</p>}
          </form>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Dépenses du jour</h2>
          <p className="mt-2 text-sm text-slate-500">Liste des dépenses enregistrées aujourd’hui pour le manager.</p>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center text-slate-500">Chargement des dépenses...</div>
            ) : (
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
                  {data?.expenses.length ? (
                    data.expenses.map((expense) => (
                      <tr key={expense.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-semibold">${expense.amount.toLocaleString()}</td>
                        <td className="py-3 text-slate-600">{expense.description}</td>
                        <td className="py-3 text-slate-500">{new Date(expense.createdAt).toLocaleString('fr-FR')}</td>
                        <td className="py-3 text-slate-500">{expense.user}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">Aucune dépense compatible manager pour cette période.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
