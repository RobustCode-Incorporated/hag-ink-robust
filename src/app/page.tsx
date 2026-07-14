"use client";
import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useState } from 'react';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function KPICard({ title, value, trend }: any) {
  const isPositive = trend >= 0;
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] uppercase font-bold text-slate-400">{title}</p>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {isPositive ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <h4 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h4>
    </div>
  );
}

export default function CEODashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseMessage, setExpenseMessage] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ceo/stats?period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Erreur API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, [period]);

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setExpenseSaving(true);
    setExpenseMessage(null);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(expenseAmount), description: expenseDescription, role: 'CEO' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Erreur serveur');

      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseMessage('Dépense CEO enregistrée.');
      await loadStats();
    } catch (error) {
      setExpenseMessage(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setExpenseSaving(false);
    }
  };

  useEffect(() => {
    if (!loading && data === null) {
      loadStats();
    }
  }, []);

  const filteredServices = useMemo(() => {
    if (!data?.latestServices) return [];
    return data.latestServices.filter((s: any) => 
      s.barber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.createdAt.includes(searchTerm)
    );
  }, [searchTerm, data]);

  if (loading && !data) return <div className="p-10 text-slate-500 dark:text-slate-400">Chargement du Command Center...</div>;

  return (
    <div className="p-8 bg-slate-50 dark:bg-black min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO</p>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Vue d'ensemble</h1>
        </div>
        <select 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 p-2 rounded-lg text-sm shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={(e) => setPeriod(e.target.value)}
            value={period}
        >
            <option value="all">Depuis toujours</option>
            <option value="month">30 derniers jours</option>
            <option value="week">7 derniers jours</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <KPICard title="CA Total" value={`$${data?.kpi?.totalRevenue?.toLocaleString() ?? 0}`} trend={data?.trendRevenue} />
        <KPICard title="Dépenses" value={`$${data?.kpi?.totalExpenses?.toLocaleString() ?? 0}`} />
        <KPICard title="Profit Net" value={`$${data?.kpi?.netProfit?.toLocaleString() ?? 0}`} trend={data?.trendProfit} />
        <KPICard title="Services" value={data?.kpi?.totalServices ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-6">Évolution CA</h3>
            {data?.monthlyRevenue && (
              <Chart 
                type="area" 
                height={300} 
                options={{ 
                    stroke: { curve: 'smooth' }, 
                    chart: { toolbar: { show: false }, foreColor: '#94a3b8' } 
                }} 
                series={[{ name: 'CA', data: data.monthlyRevenue.map((m:any) => m.val) }]} 
              />
            )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-6">Performance Barbiers</h3>
            {data?.barberPerformance && (
              <Chart 
                type="donut" 
                height={300} 
                options={{ labels: data.barberPerformance.map((b:any) => b.name) }} 
                series={data.barberPerformance.map((b:any) => b.val)} 
              />
            )}
        </div>
      </div>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mb-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-start">
          <div>
            <div className="mb-4">
              <h3 className="text-base font-semibold">Dépenses récentes</h3>
              <p className="mt-1 text-sm text-slate-500">Validation des coûts et historique des dernières sorties.</p>
            </div>
          </div>
          <form onSubmit={submitExpense} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Reporter une dépense</h3>
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
              {data?.latestExpenses?.length ? data.latestExpenses.map((expense: any) => (
                <tr key={expense.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-semibold">${expense.amount}</td>
                  <td className="py-3 text-slate-600">{expense.description}</td>
                  <td className="py-3 text-slate-500">{expense.createdAt}</td>
                  <td className="py-3 text-slate-500">{expense.user}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-4 text-slate-500">Aucune dépense récente disponible.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}