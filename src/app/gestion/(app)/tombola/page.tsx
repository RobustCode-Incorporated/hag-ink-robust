import { Badge, Card, Field, Flash, PageHeader, Stat, Table, btn, btnGhost, input } from '@/components/gestion/ui';
import { notFound } from 'next/navigation';
import { SALON } from '@/config/salon';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { addDays, salonDate } from '@/lib/timezone';
import { addLotteryTicketAction, drawLotteryAction } from '../../actions';

export const metadata = { title: 'Tombola' };

// Owner only, never on the public site (spec 009).
export default async function TombolaPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  if (!SALON.features.tombola) notFound(); // module switched off (SALON.features)
  await requireRole('OWNER');
  const sp = await searchParams;
  const rows = await query<{ ticket_num: string; draw_date: Date; is_winner: boolean; client: string; phone: string }>(
    `SELECT t.ticket_num, t.draw_date, t.is_winner, trim(c.first_name || ' ' || c.last_name) AS client, c.phone
       FROM lottery_tickets t JOIN clients c ON c.id = t.client_id ORDER BY t.draw_date DESC, t.ticket_num LIMIT 500`);
  const draws = [...new Set(rows.map((r) => r.draw_date.toISOString().slice(0, 10)))];
  const today = salonDate(new Date());

  return (
    <>
      <PageHeader title="Tombola" subtitle="Visible uniquement par la direction. La tombola n’apparaît pas sur le site public." />
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tickets" value={String(rows.length)} />
        <Stat label="Tirages" value={String(draws.length)} />
        <Stat label="Gagnants" value={String(rows.filter((r) => r.is_winner).length)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Donner un ticket">
          <form action={addLotteryTicketAction} className="space-y-3">
            <Field label="Téléphone du client"><input name="phone" required inputMode="tel" placeholder="+243…" className={input} /></Field>
            <Field label="Date du tirage"><input name="drawDate" type="date" required defaultValue={addDays(today, 30)} className={input} /></Field>
            <button className={`${btn} w-full`}>Attribuer le ticket</button>
          </form>
        </Card>
        <Card title="Tirages" className="lg:col-span-2">
          {draws.length === 0 && <p className="text-sm text-neutral-500">Aucun ticket pour l’instant.</p>}
          {draws.map((d) => {
            const tickets = rows.filter((r) => r.draw_date.toISOString().slice(0, 10) === d);
            const winner = tickets.find((r) => r.is_winner);
            return (
              <div key={d} className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">Tirage du {d} · {tickets.length} ticket(s)</p>
                  {winner ? <Badge tone="ok">Gagnant : {winner.ticket_num}</Badge> : (
                    <form action={drawLotteryAction}><input type="hidden" name="drawDate" value={d} /><button className={btnGhost}>Tirer au sort</button></form>
                  )}
                </div>
                <Table head={['Ticket', 'Client', 'Téléphone', '']}>
                  {tickets.map((r) => (
                    <tr key={r.ticket_num}>
                      <td className="px-2 py-2 font-mono text-xs">{r.ticket_num}</td>
                      <td className="px-2 py-2">{r.client}</td>
                      <td className="px-2 py-2 text-xs text-neutral-500">{r.phone}</td>
                      <td className="px-2 py-2">{r.is_winner && <Badge tone="ok">gagnant</Badge>}</td>
                    </tr>
                  ))}
                </Table>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
