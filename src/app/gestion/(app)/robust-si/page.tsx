import { Badge, Card, Field, Flash, PageHeader, Table, btn, btnGhost, input } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { salonDate } from '@/lib/timezone';
import { requestJohnReportAction } from '../../actions';
import AutoRefresh from './AutoRefresh';

export const metadata = { title: 'Robust SI' };

const STATUS: Record<string, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'danger' }> = {
  QUEUED: { label: 'en file d’attente', tone: 'neutral' },
  RUNNING: { label: 'JOHN prépare la vidéo…', tone: 'warn' },
  DONE: { label: 'prête', tone: 'ok' },
  FAILED: { label: 'échec', tone: 'danger' },
};
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;

export default async function RobustSiPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string; play?: string }> }) {
  await requireRole('OWNER'); // manager: no access (owner decision 2026-11-14)
  const sp = await searchParams;
  const reports = await query<{ id: string; period_key: string; language: string; status: string; error: string | null; duration_sec: number | null; created_at: Date }>(
    'SELECT id, period_key, language, status, error, duration_sec, created_at FROM john_reports ORDER BY created_at DESC LIMIT 20');
  const thisMonth = salonDate(new Date()).slice(0, 7);
  const months = Array.from({ length: 12 }, (_, i) => {
    const [y, m] = thisMonth.split('-').map(Number);
    const idx = y * 12 + (m - 1) - i;
    return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
  });
  const playing = reports.find((r) => r.id === sp.play && r.status === 'DONE') ?? reports.find((r) => r.status === 'DONE');
  const pending = reports.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING');

  return (
    <>
      <AutoRefresh active={pending} />
      <PageHeader title="Robust SI · JOHN" subtitle="Votre trésorier IA : le rapport vidéo du mois, prêt à présenter. Chiffres calculés depuis la caisse et les dépenses ; voix générée par IA, clonée avec consentement." />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Rapport vidéo du mois">
          <form action={requestJohnReportAction} className="space-y-3">
            <Field label="Mois">
              <select name="period" defaultValue={months[1]} className={input}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
            </Field>
            <Field label="Langue">
              <select name="language" className={input}><option value="fr">Français</option><option value="en">English</option></select>
            </Field>
            <button className={`${btn} w-full`}>Générer le rapport du mois</button>
          </form>
        </Card>
        <Card title={playing ? `Rapport ${monthLabel(playing.period_key)}` : 'Lecture'} className="lg:col-span-2">
          {playing ? (
            <video key={playing.id} controls preload="metadata" className="w-full rounded-lg bg-black" src={`/api/john/reports/${playing.id}/watch`} />
          ) : (
            <p className="text-sm text-neutral-500">Aucune vidéo pour l’instant. Choisissez un mois et cliquez sur « Générer ».</p>
          )}
        </Card>
      </div>
      <Card title="Historique" className="mt-6">
        <Table head={['Mois', 'Langue', 'Demandé le', 'Statut', '']} empty={reports.length === 0 && 'Aucun rapport.'}>
          {reports.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-2 capitalize">{monthLabel(r.period_key)}</td>
              <td className="px-2 py-2 text-xs uppercase">{r.language}</td>
              <td className="px-2 py-2 text-xs text-neutral-500">{r.created_at.toISOString().slice(0, 16).replace('T', ' ')} UTC</td>
              <td className="px-2 py-2"><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>{r.error && <p className="mt-1 text-xs text-danger">{r.error}</p>}</td>
              <td className="px-2 py-2">{r.status === 'DONE' && <a href={`/gestion/robust-si?play=${r.id}`} className={btnGhost}>Regarder</a>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
