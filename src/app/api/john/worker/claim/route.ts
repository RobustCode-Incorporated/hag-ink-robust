import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { blobPathFor, isWorkerRequest, presignUpload } from '@/lib/john';

// Called by the JOHN worker. Takes the oldest queued report (or one stuck > 30 min), atomically.
export async function POST(request: Request) {
  if (!isWorkerRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "JohnReport" SET status = 'RUNNING', "startedAt" = now(), attempts = attempts + 1
    WHERE id = (
      SELECT id FROM "JohnReport"
      WHERE (status = 'QUEUED' OR (status = 'RUNNING' AND "startedAt" < now() - interval '30 minutes'))
        AND attempts < 3
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  if (rows.length === 0) return new NextResponse(null, { status: 204 });

  const report = await prisma.johnReport.findUniqueOrThrow({ where: { id: rows[0].id } });
  const pathname = blobPathFor(report.id);
  return NextResponse.json({
    id: report.id,
    kind: report.kind,
    periodKey: report.periodKey,
    facts: report.facts,
    upload: { pathname, url: await presignUpload(pathname) },
  });
}
