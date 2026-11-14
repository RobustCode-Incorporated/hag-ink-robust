// JOHN (Robust SI): worker auth, private video storage (Vercel Blob), facts loading. Spec 011.
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { SALON } from '@/config/salon';
import { query } from '@/lib/db';
import { buildMonthlyFacts, shiftMonth, type JohnFacts, type Language } from '@/domain/john-facts';
import { salonToUtc } from '@/lib/timezone';
import { RELEASE_NOTES } from '@/config/release-notes';

const MAX_VIDEO_BYTES = 400 * 1024 * 1024;

/** Worker requests carry `Authorization: Bearer <JOHN_WORKER_KEY>` (32+ chars). */
export function isWorkerRequest(request: Request): boolean {
  const expected = process.env.JOHN_WORKER_KEY;
  const header = request.headers.get('authorization') ?? '';
  if (!expected || expected.length < 32 || !header.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const blobPathFor = (id: string) => `john/${id}.mp4`;

export async function presignUpload(pathname: string): Promise<string> {
  const validUntil = Date.now() + 30 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['put'], validUntil, allowedContentTypes: ['video/mp4'], maximumSizeInBytes: MAX_VIDEO_BYTES });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'put', pathname, access: 'private', validUntil, allowedContentTypes: ['video/mp4'],
    maximumSizeInBytes: MAX_VIDEO_BYTES, allowOverwrite: true, addRandomSuffix: false,
  });
  return presignedUrl;
}

export async function presignWatch(pathname: string): Promise<string> {
  const validUntil = Date.now() + 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
  return presignedUrl;
}

export async function loadMonthlyFacts(periodKey: string, language: Language): Promise<JohnFacts> {
  const from = salonToUtc(`${shiftMonth(periodKey, -5)}-01`, '00:00');
  const to = salonToUtc(`${shiftMonth(periodKey, 1)}-01`, '00:00');
  const tz = SALON.timezone;
  const [staff, sales, expenses] = await Promise.all([
    query<{ id: string; display_name: string; role: string; pay_type: 'COMMISSION' | 'FIXED'; commission_rate: string; fixed_salary_cents: number }>(
      'SELECT id, display_name, role, pay_type, commission_rate, fixed_salary_cents FROM staff WHERE active ORDER BY sort'),
    query<{ staff_id: string; kind: 'SERVICE' | 'PRODUCT'; amount_cents: number; tip_cents: number; day: string }>(
      `SELECT staff_id, kind, amount_cents, tip_cents, to_char(created_at AT TIME ZONE '${tz}', 'YYYY-MM-DD') AS day
         FROM sales WHERE voided_at IS NULL AND created_at >= $1 AND created_at < $2`, [from, to]),
    query<{ amount_cents: number; description: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; day: string }>(
      `SELECT amount_cents, description, status, to_char(spent_on, 'YYYY-MM-DD') AS day FROM expenses WHERE spent_on < $1::date`,
      [`${shiftMonth(periodKey, 1)}-01`]),
  ]);
  return buildMonthlyFacts({
    periodKey,
    language,
    business: { name: SALON.name, sector: 'salon', currency: SALON.currency, locale: SALON.locale },
    staff: staff.map((s) => ({ id: s.id, name: s.display_name, role: s.role, payType: s.pay_type, commissionRate: Number(s.commission_rate), fixedSalaryCents: s.fixed_salary_cents })),
    sales: sales.map((s) => ({ staffId: s.staff_id, kind: s.kind, cents: s.amount_cents, tipCents: s.tip_cents, day: s.day })),
    expenses: expenses.map((e) => ({ cents: e.amount_cents, description: e.description, status: e.status, day: e.day })),
    releaseNotes: RELEASE_NOTES,
  });
}
