import { NextResponse, type NextRequest } from 'next/server';
import { BookingError, getAvailability } from '@/lib/booking';

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const serviceId = p.get('serviceId') ?? '';
  const staffId = p.get('staffId') ?? 'any';
  if (!UUID.test(serviceId) || (staffId !== 'any' && !UUID.test(staffId))) {
    return NextResponse.json({ error: 'INVALID' }, { status: 400 });
  }
  try {
    const { slots } = await getAvailability({ date: p.get('date') ?? '', serviceId, staffId });
    return NextResponse.json({ slots: slots.map((s) => s.time) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.code }, { status: e.code === 'NOT_FOUND' ? 404 : 400 });
    throw e;
  }
}
