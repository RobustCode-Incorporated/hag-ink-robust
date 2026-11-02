import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { presignWatch } from '@/lib/john';

// Protected by middleware (/api/ceo/*). Redirects to a private blob URL valid 1 h.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.johnReport.findUnique({ where: { id }, select: { status: true, blobPath: true } });
  if (!report || report.status !== 'DONE' || !report.blobPath) {
    return NextResponse.json({ error: 'Vidéo indisponible.' }, { status: 404 });
  }
  const url = await presignWatch(report.blobPath);
  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
}
