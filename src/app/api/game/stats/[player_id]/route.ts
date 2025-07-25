import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const player_id = url.pathname.split('/').slice(-1)[0];
  // In a real app, aggregate stats from DB
  return NextResponse.json([
    {
      session_id: player_id,
      total_games_played: 0,
      total_score: 0,
      average_score: 0,
      best_score: 0,
      completion_rate: 0,
      rewards_earned: [],
    },
  ]);
}
