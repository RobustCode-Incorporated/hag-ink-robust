import { NextResponse, type NextRequest } from 'next/server';
import { SALON } from '@/config/salon';
import { findPlan, flexpayPhone, paymentReference } from '@/domain/memberships';
import { tx } from '@/lib/db';
import { upsertClient } from '@/lib/booking';
import { flexpayConfig, FlexpayError, startCard, startMobileMoney } from '@/lib/flexpay';
import { normalizePhone } from '@/lib/format';

// Starts a FlexPay payment for a pack (spec 012). Off while SALON.features.memberships is false.
export async function POST(request: NextRequest) {
  if (!SALON.features.memberships) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!flexpayConfig()) return NextResponse.json({ error: 'Le paiement FlexPay n’est pas encore configuré.' }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const plan = findPlan(body.planCode);
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const phone = normalizePhone(body.phone);
  const method = body.method === 'CARD' ? 'CARD' : body.method === 'MOBILE_MONEY' ? 'MOBILE_MONEY' : null;
  const locale = typeof body.locale === 'string' && /^(fr|es|nl|en)$/.test(body.locale) ? body.locale : 'fr';
  if (!plan || !firstName || !lastName || !phone || !method) {
    return NextResponse.json({ error: 'Veuillez renseigner prénom, nom, téléphone et une formule valide.' }, { status: 400 });
  }
  const mmPhone = method === 'MOBILE_MONEY' ? flexpayPhone(phone) : null;
  if (method === 'MOBILE_MONEY' && !mmPhone) {
    return NextResponse.json({ error: 'Numéro invalide pour Mobile Money (format attendu : +243841938211).' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const reference = paymentReference(Date.now(), Math.random);
  const common = { reference, amount: (plan.priceCents / 100).toString(), currency: SALON.currency, callbackUrl: `${origin}/api/payments/webhook` };
  try {
    const started = method === 'MOBILE_MONEY'
      ? await startMobileMoney({ ...common, phone: mmPhone! })
      : await startCard({
          ...common, description: `${SALON.name} - ${plan.name}`,
          approveUrl: `${origin}/${locale}?payment=success#packs`,
          cancelUrl: `${origin}/${locale}?payment=cancelled#packs`,
          declineUrl: `${origin}/${locale}?payment=failed#packs`,
        });
    await tx(async (c) => {
      const clientId = await upsertClient(c, { firstName, lastName, phone, email });
      await c.query(
        `INSERT INTO membership_payments (order_number, reference, plan_code, amount_cents, currency, method, client_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [started.orderNumber, reference, plan.code, plan.priceCents, SALON.currency, method, clientId]);
    });
    return NextResponse.json('url' in started ? { url: started.url } : { message: started.message });
  } catch (e) {
    console.error('FlexPay checkout failed:', e);
    const status = e instanceof FlexpayError ? 502 : 500;
    return NextResponse.json({ error: 'Impossible de démarrer le paiement sécurisé.' }, { status });
  }
}
