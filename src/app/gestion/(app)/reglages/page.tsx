import { Card, Flash, PageHeader, input, btn } from '@/components/gestion/ui';
import { requireRole } from '@/lib/auth';
import { getOpeningHours } from '@/lib/hours';
import { SALON } from '@/config/salon';
import { saveHoursAction } from '../../actions';

export const metadata = { title: 'Réglages' };
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default async function ReglagesPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireRole('OWNER');
  const sp = await searchParams;
  const hours = await getOpeningHours();
  return (
    <>
      <PageHeader title="Réglages" subtitle="Horaires d'ouverture (réservations en ligne et site public)." />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Horaires">
          <form action={saveHoursAction} className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <div key={d} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-2 text-sm">
                <span>{DAYS[d]}</span>
                <input type="time" name={`opens_${d}`} defaultValue={hours[d]?.opens ?? '11:00'} className={input} />
                <input type="time" name={`closes_${d}`} defaultValue={hours[d]?.closes ?? '19:00'} className={input} />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name={`closed_${d}`} defaultChecked={!hours[d]} /> Fermé</label>
              </div>
            ))}
            <button className={`${btn} mt-3 w-full`}>Enregistrer les horaires</button>
          </form>
        </Card>
        <Card title="Règles de réservation (fichier de configuration)">
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>Créneaux toutes les <b>{SALON.booking.slotStepMin} min</b>, durée selon la prestation.</li>
            <li>Réservation au plus tard <b>{SALON.booking.minLeadMin} min</b> avant, jusqu&apos;à <b>{SALON.booking.maxDaysAhead} jours</b> à l&apos;avance.</li>
            <li>Annulation en ligne jusqu&apos;à <b>{SALON.booking.cancelUntilMin / 60} h</b> avant.</li>
            <li>Paiement : <b>sur place</b> (comme sur Planity).</li>
            <li>Maximum 3 rendez-vous à venir par numéro de téléphone (anti-abus).</li>
          </ul>
          <p className="mt-4 text-xs text-neutral-400">Pour changer ces règles : src/config/salon.ts (voir docs/specs).</p>
        </Card>
      </div>
    </>
  );
}
