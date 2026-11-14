import { NextResponse } from 'next/server';
import { requireRole, MANAGERS } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { presignWatch } from '@/lib/john';

// Logged-in owner/manager only: redirects to a private Blob URL valid 1 h.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(...MANAGERS);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const r = await queryOne<{ blob_path: string | null; status: string }>('SELECT blob_path, status FROM john_reports WHERE id = $1', [id]);
  if (!r || r.status !== 'DONE' || !r.blob_path) return NextResponse.json({ error: 'Vidéo indisponible.' }, { status: 404 });
  return NextResponse.redirect(await presignWatch(r.blob_path), { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
}
