import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 4) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const data = await getSession(id);
  if (!data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
