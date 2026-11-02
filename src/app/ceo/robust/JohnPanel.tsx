'use client';

import { useCallback, useEffect, useState } from 'react';

export type JohnReportView = {
  id: string;
  kind: 'MONTHLY' | 'DAILY';
  periodKey: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  error: string | null;
  durationSec: number | null;
  createdAt: string;
  finishedAt: string | null;
};

const STATUS: Record<JohnReportView['status'], { label: string; cls: string }> = {
  QUEUED: { label: 'En file d’attente', cls: 'bg-slate-100 text-slate-600' },
  RUNNING: { label: 'JOHN prépare la vidéo…', cls: 'bg-amber-100 text-amber-700' },
  DONE: { label: 'Prête', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Échec', cls: 'bg-red-100 text-red-700' },
};

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function JohnPanel({ initialReports, months, defaultMonth, focusId }: {
  initialReports: JohnReportView[];
  months: string[];
  defaultMonth: string;
  focusId: string | null;
}) {
  const [reports, setReports] = useState(initialReports);
  const [month, setMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(
    focusId ?? initialReports.find((r) => r.status === 'DONE')?.id ?? null,
  );

  const refresh = useCallback(async () => {
    const res = await fetch('/api/ceo/john/reports', { cache: 'no-store' });
    if (res.ok) setReports((await res.json()).reports);
  }, []);

  const pending = reports.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ceo/john/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  const current = reports.find((r) => r.id === playing && r.status === 'DONE');

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Rapport vidéo du mois</h2>
        <p className="mt-1 text-sm text-slate-500">Choisissez le mois, JOHN s’occupe du reste. Comptez quelques minutes.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <span className="font-medium">Mois</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent pr-2 capitalize outline-none">
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Envoi…' : 'Générer le rapport du mois'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>

      {current && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <video key={current.id} controls preload="metadata" className="w-full rounded-2xl bg-black" src={`/api/ceo/john/reports/${current.id}/watch`} />
          <p className="mt-3 px-2 text-sm text-slate-500">
            Rapport de <span className="font-semibold capitalize text-slate-700">{monthLabel(current.periodKey)}</span>
            {current.durationSec ? ` · ${Math.floor(current.durationSec / 60)} min ${Math.round(current.durationSec % 60)} s` : ''}
            {' · '}Voix générée par IA, clonée avec consentement.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Historique</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun rapport pour l’instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold capitalize">{monthLabel(r.periodKey)}</p>
                  <p className="text-xs text-slate-400">Demandé le {new Date(r.createdAt).toLocaleString('fr-FR')}</p>
                  {r.status === 'FAILED' && r.error && <p className="mt-1 text-xs text-red-600">{r.error}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                  {r.status === 'DONE' && (
                    <button type="button" onClick={() => setPlaying(r.id)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold hover:bg-slate-50">
                      Regarder
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
