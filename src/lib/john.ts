import { timingSafeEqual } from 'crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import type { NextRequest } from 'next/server';

const MAX_VIDEO_BYTES = 400 * 1024 * 1024;

/** Worker requests carry `Authorization: Bearer <JOHN_WORKER_KEY>`. */
export function isWorkerRequest(request: Request): boolean {
  const expected = process.env.JOHN_WORKER_KEY;
  const header = request.headers.get('authorization') ?? '';
  if (!expected || expected.length < 32 || !header.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sessionEmail(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.email ?? null;
}

export function blobPathFor(reportId: string): string {
  return `john/hag-ink/${reportId}.mp4`;
}

/** One-file upload URL for the worker (private store, mp4 only, 30 min). */
export async function presignUpload(pathname: string): Promise<string> {
  const validUntil = Date.now() + 30 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['put'], validUntil, allowedContentTypes: ['video/mp4'], maximumSizeInBytes: MAX_VIDEO_BYTES });
  const { presignedUrl } = await presignUrl(token, {
    operation: 'put',
    pathname,
    access: 'private',
    validUntil,
    allowedContentTypes: ['video/mp4'],
    maximumSizeInBytes: MAX_VIDEO_BYTES,
    allowOverwrite: true,
    addRandomSuffix: false,
  });
  return presignedUrl;
}

/** Short-lived read URL for a logged-in CEO (1 h). */
export async function presignWatch(pathname: string): Promise<string> {
  const validUntil = Date.now() + 60 * 60 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
  return presignedUrl;
}

/** Optional e-mail: link to the app only, never numbers. */
export async function notifyReportReady(origin: string, reportId: string, periodLabel: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.JOHN_NOTIFY_EMAIL ?? process.env.CEO_LOGIN_EMAIL;
  const from = process.env.JOHN_EMAIL_FROM;
  if (!key || !to || !from) return false;
  const link = `${origin}/ceo/robust?report=${reportId}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      subject: `JOHN : votre rapport vidéo de ${periodLabel} est prêt`,
      text: `Bonjour,\n\nVotre rapport vidéo de ${periodLabel} est prêt.\nConnectez-vous pour le regarder : ${link}\n\nJOHN, Robust SI`,
    }),
  });
  return res.ok;
}
