import { NextResponse } from 'next/server';
import { audit, queryOne } from '@/lib/db';
import { blobPathFor, isWorkerRequest } from '@/lib/john';

export async function POST(request: Request) {
  if (!isWorkerRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  const ok = body.ok === true;
  const row = await queryOne<{ id: string }>(
    ok
      ? `UPDATE john_reports SET status = 'DONE', blob_path = $2, duration_sec = $3, script = $4, error = NULL, finished_at = now()
          WHERE id = $1 AND status = 'RUNNING' RETURNING id`
      : `UPDATE john_reports SET status = 'FAILED', error = left($2, 1000), finished_at = now() WHERE id = $1 AND status = 'RUNNING' RETURNING id`,
    ok
      ? [body.id, blobPathFor(body.id), typeof body.durationSec === 'number' ? body.durationSec : null, JSON.stringify(body.script ?? null)]
      : [body.id, String(body.error ?? 'Erreur inconnue')]);
  if (!row) return NextResponse.json({ error: 'Report not running.' }, { status: 409 });
  await audit(null, ok ? 'john.done' : 'john.failed', 'john_report', body.id);
  return NextResponse.json({ status: ok ? 'DONE' : 'FAILED' });
}
