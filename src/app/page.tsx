"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
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
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Hag-Ink Command Center</h1>
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase text-slate-400">Dernières Transactions</h3>
            <input 
                type="text"
                placeholder="Rechercher (Barbier, Date)..."
                className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-gray-800 p-2 rounded-lg text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <tr className="text-slate-400 text-xs border-b border-slate-100 dark:border-gray-800">
                    <th className="pb-3 uppercase">Barbier</th>
                    <th className="pb-3 uppercase">Date</th>
                    <th className="pb-3 uppercase">Montant</th>
                </tr>
            </thead>
            <tbody>
                {filteredServices.map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="py-4 font-medium">{s.barber}</td>
                        <td className="py-4 text-slate-500 dark:text-slate-400">{s.createdAt}</td>
                        <td className="py-4 font-bold text-slate-900 dark:text-white">${s.amount}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}