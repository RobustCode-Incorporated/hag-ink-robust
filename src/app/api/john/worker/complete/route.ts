import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { blobPathFor, isWorkerRequest, notifyReportReady } from '@/lib/john';

export async function POST(request: Request) {
  if (!isWorkerRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'id required.' }, { status: 400 });

  const report = await prisma.johnReport.findUnique({ where: { id: body.id } });
  if (!report || report.status !== 'RUNNING') return NextResponse.json({ error: 'Report not running.' }, { status: 409 });

  if (body.ok !== true) {
    await prisma.johnReport.update({
      where: { id: report.id },
      data: { status: 'FAILED', error: String(body.error ?? 'Erreur inconnue').slice(0, 1000), finishedAt: new Date() },
    });
    return NextResponse.json({ status: 'FAILED' });
  }

  await prisma.johnReport.update({
    where: { id: report.id },
    data: {
      status: 'DONE',
      blobPath: blobPathFor(report.id),
      durationSec: typeof body.durationSec === 'number' ? body.durationSec : null,
      script: body.script ?? undefined,
      error: null,
      finishedAt: new Date(),
    },
  });
  const facts = report.facts as { period?: { label?: string } };
  const emailed = await notifyReportReady(new URL(request.url).origin, report.id, facts.period?.label ?? report.periodKey).catch(() => false);
  return NextResponse.json({ status: 'DONE', emailed });
}
