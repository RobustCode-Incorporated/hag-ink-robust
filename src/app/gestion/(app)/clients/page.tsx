import { Card, PageHeader, Table, input, btnGhost } from '@/components/gestion/ui';
import { requireRole, MANAGERS } from '@/lib/auth';
import { query } from '@/lib/db';
import { euros } from '@/lib/format';
import { salonDate } from '@/lib/timezone';

export const metadata = { title: 'Clients' };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole(...MANAGERS);
  const isOwner = user.role === 'OWNER'; // the manager does not see what clients spent over time
  const q = ((await searchParams).q ?? '').trim().slice(0, 60);
  const rows = await query<{ id: string; first_name: string; last_name: string; phone: string; email: string | null; created_at: Date;
                              visits: number; spent: number; last_visit: Date | null; next_visit: Date | null; noshows: number }>(
    `SELECT c.id, c.first_name, c.last_name, c.phone, c.email, c.created_at,
            (SELECT count(*) FROM sales s WHERE s.client_id = c.id AND s.voided_at IS NULL AND s.kind='SERVICE')::int AS visits,
            (SELECT COALESCE(sum(amount_cents),0) FROM sales s WHERE s.client_id = c.id AND s.voided_at IS NULL)::int AS spent,
            (SELECT max(created_at) FROM sales s WHERE s.client_id = c.id AND s.voided_at IS NULL) AS last_visit,
            (SELECT min(starts_at) FROM appointments a WHERE a.client_id = c.id AND a.status='BOOKED' AND a.starts_at > now()) AS next_visit,
            (SELECT count(*) FROM appointments a WHERE a.client_id = c.id AND a.status='NO_SHOW')::int AS noshows
       FROM clients c
      WHERE $1 = '' OR c.first_name ILIKE '%' || $1 || '%' OR c.last_name ILIKE '%' || $1 || '%' OR c.phone LIKE '%' || regexp_replace($1, '\\s', '', 'g') || '%'
      ORDER BY last_visit DESC NULLS LAST, c.created_at DESC LIMIT 200`, [q]);

  return (
    <>
      <PageHeader title="Clients" subtitle="Créés automatiquement à chaque réservation ou encaissement (identifiés par téléphone)." />
      <Card>
        <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Nom ou téléphone…" className={input} /><button className={btnGhost}>Chercher</button></form>
        <Table head={['Client', 'Téléphone', 'Visites', ...(isOwner ? ['Dépensé'] : []), 'Dernière visite', 'Prochain RDV', 'Absences']} empty={rows.length === 0 && 'Aucun client.'}>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-2 py-2">{c.first_name} {c.last_name}{c.email && <span className="block text-xs text-neutral-400">{c.email}</span>}</td>
              <td className="px-2 py-2"><a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></td>
              <td className="px-2 py-2">{c.visits}</td>
              {isOwner && <td className="px-2 py-2">{euros(c.spent)}</td>}
              <td className="px-2 py-2">{c.last_visit ? salonDate(c.last_visit) : '—'}</td>
              <td className="px-2 py-2">{c.next_visit ? salonDate(c.next_visit) : '—'}</td>
              <td className={`px-2 py-2 ${c.noshows ? 'text-danger' : ''}`}>{c.noshows || '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
