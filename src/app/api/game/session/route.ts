import { db } from '../db';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { player_id } = await req.json();
  const id = randomUUID();
  const newSession = {
    id,
    player_id,
    current_round: 0,
    score: 0,
    attempts_remaining: db.config.max_attempts,
    caught_letters: [],
    is_completed: false,
  };
  db.sessions.set(id, newSession);
  return NextResponse.json(newSession);
}
