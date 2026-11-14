import { NextResponse, type NextRequest } from 'next/server';
import { BookingError, createBooking, type Locale } from '@/lib/booking';
import { queryOne } from '@/lib/db';
import { normalizePhone, euros } from '@/lib/format';
import { sendEmail } from '@/lib/email';
import { salonDate, salonTime } from '@/lib/timezone';
import { SALON, SITE_URL } from '@/config/salon';

const LOCALES: Locale[] = ['fr', 'es', 'nl', 'en'];
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '');
  const locale = LOCALES.includes(str('locale') as Locale) ? (str('locale') as Locale) : 'fr';
  if (str('website')) return NextResponse.json({ error: 'INVALID' }, { status: 400 }); // honeypot
  if (!UUID.test(str('serviceId')) || (str('staffId') !== 'any' && !UUID.test(str('staffId')))) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  if (body.consent !== true) return NextResponse.json({ error: 'CONSENT' }, { status: 400 });

  // Anti-abuse: at most 3 upcoming online bookings per phone number.
  const phone = normalizePhone(str('phone'));
  if (phone) {
    const live = await queryOne<{ n: number }>(
      `SELECT count(*)::int AS n FROM appointments a JOIN clients c ON c.id = a.client_id
        WHERE c.phone = $1 AND a.status = 'BOOKED' AND a.starts_at > now()`,
      [phone],
    );
    if ((live?.n ?? 0) >= 3) return NextResponse.json({ error: 'TOO_MANY' }, { status: 429 });
  }

  try {
    const b = await createBooking({
      serviceId: str('serviceId'), staffId: str('staffId') || 'any', date: str('date'), time: str('time'),
      firstName: str('firstName'), lastName: str('lastName'), phone: str('phone'), email: str('email') || null,
      notes: str('notes') || null, locale, source: 'ONLINE',
      referral: str('ref') || str('promoCode') ? { slug: str('ref') || null, code: str('promoCode') || null } : undefined,
    });
    const manageUrl = `${SITE_URL}${locale === 'fr' ? '' : `/${locale}`}/rdv/${b.manageToken}`;
    const email = str('email');
    if (email) {
      await sendEmail(
        email,
        `${SALON.name} — ${salonDate(b.startsAt)} ${salonTime(b.startsAt)}`,
        `<p>${b.serviceName} · ${b.staffName}</p><p><b>${salonDate(b.startsAt)} ${salonTime(b.startsAt)}</b> — ${euros(b.priceCents)} (paiement sur place)</p>
         <p>${SALON.address.street}, ${SALON.address.postalCode} ${SALON.address.city}</p><p><a href="${manageUrl}">${manageUrl}</a></p>`,
      );
    }
    return NextResponse.json({ token: b.manageToken }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      const status = e.code === 'SLOT_TAKEN' ? 409 : e.code === 'NOT_FOUND' ? 404 : e.code === 'PROMO_INVALID' ? 422 : 400;
      return NextResponse.json({ error: e.code }, { status });
    }
    throw e;
  }
}
