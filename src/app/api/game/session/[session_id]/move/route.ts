import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../db';

export async function POST(req: NextRequest, { params }: { params: { session_id: string } }) {
  const session = db.sessions.get(params.session_id);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const { letter_clicked, letter_color } = await req.json();
  const config = db.config;
  const round = config.rounds[session.current_round];
  const expected = round.letters[session.caught_letters.length];
  let is_correct = false;
  let round_completed = false;
  let game_completed = false;
  if (expected && letter_clicked === expected.letter && letter_color === expected.color) {
    is_correct = true;
    session.caught_letters.push(letter_clicked);
    session.score += 10;
    if (session.caught_letters.length === round.letters.length) {
      session.current_round++;
      session.caught_letters = [];
      round_completed = true;
      if (session.current_round >= config.rounds.length) {
        session.is_completed = true;
        game_completed = true;
        session.final_reward = session.score >= 50 ? (session.score >= 70 ? (session.score === 100 ? '🏆 Goal Box' : '💰 Dollar Box') : '🪙 Coin Box') : '❌ Try Again';
      }
    }
  } else {
    session.attempts_remaining--;
    if (session.attempts_remaining <= 0) {
      session.is_completed = true;
      game_completed = true;
      session.final_reward = session.score >= 50 ? (session.score >= 70 ? (session.score === 100 ? '🏆 Goal Box' : '💰 Dollar Box') : '🪙 Coin Box') : '❌ Try Again';
    }
  }
  db.sessions.set(params.session_id, session);
  return NextResponse.json({
    is_correct,
    session,
    expected_letter: expected?.letter,
    expected_color: expected?.color,
    round_completed,
    game_completed,
  });
}
