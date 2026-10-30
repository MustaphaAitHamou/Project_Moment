import { NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server-context';

/** Sonde de disponibilité (sans donnée sensible). */
export async function GET() {
  try {
    const { error } = await getServerContext().admin.from('countries').select('code', { head: true, count: 'exact' });
    return NextResponse.json({ status: error ? 'degraded' : 'ok', database: error ? 'unreachable' : 'ok' }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unconfigured' }, { status: 503 });
  }
}
