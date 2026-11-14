import { randomInt } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { SALON } from '@/config/salon';
import { ticketNumber } from '@/domain/lottery';
import { findPlan, membershipEnd } from '@/domain/memberships';
import { tx } from '@/lib/db';
import { salonDate } from '@/lib/timezone';

// FlexPay callback (spec 012). Always active, even with the packs switched off, so a payment already
// started is never lost. The payment row (PENDING) was created at checkout with FlexPay's orderNumber.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: unknown; orderNumber?: unknown; provider_reference?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  if (String(body.code) !== '0') {
    console.log('FlexPay transaction not successful', body);
    return NextResponse.json({ received: true });
  }
  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber : null;
  if (!orderNumber) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  try {
    const outcome = await tx(async (c) => {
      const pay = (await c.query<{ id: string; client_id: string; plan_code: string; amount_cents: number; status: string }>(
        'SELECT id, client_id, plan_code, amount_cents, status FROM membership_payments WHERE order_number = $1 FOR UPDATE', [orderNumber])).rows[0];
      if (!pay) return 'UNKNOWN' as const;
      if (pay.status !== 'PENDING') return 'DUPLICATE' as const;
      const plan = findPlan(pay.plan_code);
      if (!plan || plan.priceCents !== pay.amount_cents) return 'MISMATCH' as const;

      const now = new Date();
      await c.query(`UPDATE membership_payments SET status = 'PAID', paid_at = $2, provider_reference = $3 WHERE id = $1`,
        [pay.id, now, typeof body.provider_reference === 'string' ? body.provider_reference : null]);
      const end = membershipEnd(now, plan.months);
      await c.query('INSERT INTO client_memberships (client_id, plan_code, starts_at, ends_at, payment_id) VALUES ($1, $2, $3, $4, $5)',
        [pay.client_id, plan.code, now, end, pay.id]);
      if (SALON.features.tombola) {
        const drawDate = salonDate(end);
        const existing = new Set((await c.query<{ ticket_num: string }>('SELECT ticket_num FROM lottery_tickets WHERE draw_date = $1', [drawDate])).rows.map((r) => r.ticket_num));
        for (let i = 0; i < plan.tickets; i++) {
          const num = ticketNumber(drawDate, existing, () => randomInt(10000) / 10000);
          existing.add(num);
          await c.query('INSERT INTO lottery_tickets (ticket_num, draw_date, client_id) VALUES ($1, $2, $3)', [num, drawDate, pay.client_id]);
        }
      }
      return 'PAID' as const;
    });
    if (outcome === 'UNKNOWN') return NextResponse.json({ error: 'Unknown transaction' }, { status: 400 });
    if (outcome === 'MISMATCH') return NextResponse.json({ error: 'Plan mismatch' }, { status: 400 });
    return NextResponse.json({ received: true, ...(outcome === 'DUPLICATE' ? { duplicate: true } : {}) });
  } catch (e) {
    console.error('FlexPay webhook failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
