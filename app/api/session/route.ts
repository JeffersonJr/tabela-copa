import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { saveSession } from '@/lib/db';
import { TournamentState } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const state: TournamentState = body.state;

    if (!state || !state.version) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    // Generate or reuse session ID
    const sessionId: string = body.sessionId ?? nanoid(8);

    await saveSession(sessionId, state);

    return NextResponse.json({ sessionId });
  } catch (err) {
    console.error('Save session error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
