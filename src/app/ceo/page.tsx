"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function KPICard({ title, value }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{title}</p>
      <h4 className="text-2xl font-black">{value}</h4>
    </div>
  );
}

export default function CEODashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [searchTerm, setSearchTerm] = useState(''); // État pour la recherche

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ceo/stats?period=${period}`)
      .then(res => res.json())
      .then(json => { 
        setData(json); 
        setLoading(false); 
      })
      .catch(err => { 
        console.error("Erreur API:", err); 
        setLoading(false); 
      });
  }, [period]); 

  // Filtrage dynamique du tableau
  const filteredServices = useMemo(() => {
    if (!data?.latestServices) return [];
    return data.latestServices.filter((s: any) => 
      s.barber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.createdAt.includes(searchTerm)
    );
  }, [searchTerm, data]);

  if (loading && !data) return <div className="p-10 text-slate-500">Chargement du Command Center...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO</p>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Vue d'ensemble</h1>
        </div>
        <select 
            className="bg-white border border-slate-200 p-2 rounded-lg text-sm shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={(e) => setPeriod(e.target.value)}
            value={period}
        >
            <option value="all">Depuis toujours</option>
            <option value="month">30 derniers jours</option>
            <option value="week">7 derniers jours</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <KPICard title="CA Total" value={`$${data?.kpi?.totalRevenue?.toLocaleString() ?? 0}`} />
        <KPICard title="Dépenses" value={`$${data?.kpi?.totalExpenses?.toLocaleString() ?? 0}`} />
        <KPICard title="Profit Net" value={`$${data?.kpi?.netProfit?.toLocaleString() ?? 0}`} />
        <KPICard title="Services" value={data?.kpi?.totalServices ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-6">Évolution CA</h3>
            {data?.monthlyRevenue && (
              <Chart type="area" height={300} options={{ stroke: { curve: 'smooth' }, chart: { toolbar: { show: false } } }} series={[{ name: 'CA', data: data.monthlyRevenue.map((m:any) => m.val) }]} />
            )}
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-6">Performance Barbiers</h3>
            {data?.barberPerformance && (
              <Chart type="donut" height={300} options={{ labels: data.barberPerformance.map((b:any) => b.name) }} series={data.barberPerformance.map((b:any) => b.val)} />
            )}
        </div>
      </div>

      <section className="rounded-2xl bg-white border shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Dépenses récentes</h3>
            <p className="mt-1 text-sm text-slate-500">Validation des coûts et historique des dernières sorties.</p>
          </div>
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

      {/* Table avec recherche */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase text-slate-400">Dernières Transactions</h3>
            <input 
                type="text"
                placeholder="Rechercher (Barbier, Date)..."
                className="border border-slate-200 p-2 rounded-lg text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
                <tr className="text-slate-400 text-xs border-b">
                    <th className="pb-3 uppercase">Barbier</th>
                    <th className="pb-3 uppercase">Date</th>
                    <th className="pb-3 uppercase">Montant</th>
                </tr>
            </thead>
            <tbody>
                {filteredServices.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-medium">{s.barber}</td>
                        <td className="py-4 text-slate-500">{s.createdAt}</td>
                        <td className="py-4 font-bold">${s.amount}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}