import { db } from '../db';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    sessionCount: db.sessions.size,
    sessionIds: Array.from(db.sessions.keys()),
    sessions: Object.fromEntries(db.sessions.entries())
  });
}
