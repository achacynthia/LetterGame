import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const session_id = url.pathname.split('/').slice(-1)[0];
  const session = db.sessions.get(session_id);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json(session);
}
