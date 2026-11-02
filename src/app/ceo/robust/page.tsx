import prisma from '@/lib/prisma';
import { JohnPanel, type JohnReportView } from './JohnPanel';

export const dynamic = 'force-dynamic';

function lastMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export default async function CEORobustPage({ searchParams }: { searchParams?: Promise<{ report?: string }> }) {
  const params = await searchParams;
  const reports = await prisma.johnReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, kind: true, periodKey: true, status: true, error: true, durationSec: true, createdAt: true, finishedAt: true },
  });
  const months = lastMonths(12);
  const initial: JohnReportView[] = reports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Espace CEO · Robust SI</p>
          <h1 className="mt-2 text-3xl font-black uppercase">JOHN, votre trésorier IA</h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            JOHN lit les prestations, les commissions et les dépenses du mois, puis prépare une vidéo à présenter :
            chiffres clés, évolution, équipe, points d’attention et actions prioritaires. Les chiffres sont calculés
            directement depuis votre base ; la voix est générée par IA, clonée avec consentement.
          </p>
        </div>
        <JohnPanel initialReports={initial} months={months} defaultMonth={months[1]} focusId={params?.report ?? null} />
      </div>
    </div>
  );
}
