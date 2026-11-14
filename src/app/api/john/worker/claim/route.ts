import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { blobPathFor, isWorkerRequest, presignUpload } from '@/lib/john';

// JOHN worker: takes the oldest queued report (or one stuck > 30 min), atomically. Spec 011.
export async function POST(request: Request) {
  if (!isWorkerRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const job = await queryOne<{ id: string; kind: string; period_key: string; facts: unknown }>(
    `UPDATE john_reports SET status = 'RUNNING', started_at = now(), attempts = attempts + 1
      WHERE id = (SELECT id FROM john_reports
                   WHERE (status = 'QUEUED' OR (status = 'RUNNING' AND started_at < now() - interval '30 minutes')) AND attempts < 3
                   ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING id, kind, period_key, facts`);
  if (!job) return new NextResponse(null, { status: 204 });
  const pathname = blobPathFor(job.id);
  return NextResponse.json({ id: job.id, kind: job.kind, periodKey: job.period_key, facts: job.facts, upload: { pathname, url: await presignUpload(pathname) } });
}
