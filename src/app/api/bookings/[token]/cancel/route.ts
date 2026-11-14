import { NextResponse } from 'next/server';
import { cancelByToken } from '@/lib/booking';

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const result = await cancelByToken(token);
  const status = result === 'OK' ? 200 : result === 'TOO_LATE' ? 409 : 404;
  return NextResponse.json({ result }, { status });
}
