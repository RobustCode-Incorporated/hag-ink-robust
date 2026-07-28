"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Winner = {
  rank: number;
  prize: string;
  ticketNum: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
};

type WinnersResponse = {
  month: string;
  winners: Winner[];
  error?: string;
};

type MonthlyWinner = {
  month: string;
  winningTicket: string | null;
  tickets: string[];
  winnersCount: number;
};

type MonthlyWinnersResponse = {
  monthlyWinners: MonthlyWinner[];
  error?: string;
};

function currentMonthText() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function CEOLotteryPage() {
  const [month, setMonth] = useState(currentMonthText());
  const [loading, setLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [monthlyWinners, setMonthlyWinners] = useState<MonthlyWinner[]>([]);

  const titleMonth = useMemo(() => month, [month]);

  const loadWinners = async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ceo/lottery/draw?month=${encodeURIComponent(targetMonth)}`);
      const data = (await response.json()) as WinnersResponse;
      if (!response.ok) {
        throw new Error(data.error ?? 'Impossible de charger les gagnants.');
      }
      setWinners(data.winners);
    } catch (loadError) {
      setWinners([]);
      setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWinners(month);
  }, [month]);

  const loadMonthlyWinners = async () => {
    setLoadingMonthly(true);
    try {
      const response = await fetch('/api/ceo/lottery/winners');
      const data = (await response.json()) as MonthlyWinnersResponse;
      if (!response.ok) {
        throw new Error(data.error ?? 'Impossible de charger les tickets gagnants par mois.');
      }
      setMonthlyWinners(data.monthlyWinners);
    } catch {
      setMonthlyWinners([]);
    } finally {
      setLoadingMonthly(false);
    }
  };

  useEffect(() => {
    void loadMonthlyWinners();
  }, []);

  const draw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDrawing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ceo/lottery/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = (await response.json()) as WinnersResponse & { winnersCount?: number };
      if (!response.ok) {
        throw new Error(data.error ?? 'Le tirage a echoue.');
      }

      setWinners(data.winners);
      setSuccess(`Tirage ${data.month} termine: ${data.winners.length} gagnant(s).`);
      await loadMonthlyWinners();
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : 'Erreur pendant le tirage.');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO</p>
            <h1 className="text-2xl font-black">Tombola mensuelle</h1>
          </div>
          <p className="text-sm text-slate-500">Executer le tirage et visualiser les gagnants par mois.</p>
        </div>

        <form onSubmit={draw} className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
            <label className="block text-sm font-medium text-slate-700">
              Mois du tirage
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadWinners(month)}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-100"
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
            <button
              disabled={drawing}
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {drawing ? 'Tirage en cours...' : 'Lancer le tirage'}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-4 text-sm text-emerald-700">{success}</p>}
        </form>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Gagnants {titleMonth}</h2>
            <span className="text-sm text-slate-500">Total: {winners.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-3">Rang</th>
                  <th className="py-3">Prix</th>
                  <th className="py-3">Ticket</th>
                  <th className="py-3">Client</th>
                  <th className="py-3">Telephone</th>
                </tr>
              </thead>
              <tbody>
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <tr key={winner.ticketNum} className="border-b last:border-0">
                      <td className="py-3 font-semibold">{winner.rank}</td>
                      <td className="py-3">{winner.prize}</td>
                      <td className="py-3 font-mono text-xs">{winner.ticketNum}</td>
                      <td className="py-3">{winner.client.firstName} {winner.client.lastName}</td>
                      <td className="py-3">{winner.client.phone}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">Aucun gagnant pour ce mois.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Numero du ticket gagnant par mois</h2>
            <button
              type="button"
              onClick={() => void loadMonthlyWinners()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              {loadingMonthly ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-3">Mois</th>
                  <th className="py-3">Ticket gagnant</th>
                  <th className="py-3">Nombre de gagnants</th>
                </tr>
              </thead>
              <tbody>
                {monthlyWinners.length > 0 ? (
                  monthlyWinners.map((entry) => (
                    <tr key={entry.month} className="border-b last:border-0">
                      <td className="py-3 font-semibold">{entry.month}</td>
                      <td className="py-3 font-mono text-xs">{entry.winningTicket ?? '-'}</td>
                      <td className="py-3">{entry.winnersCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">Aucun ticket gagnant enregistre pour le moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
