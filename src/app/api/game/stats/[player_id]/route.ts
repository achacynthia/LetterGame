import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { player_id: string } }) {
  // In a real app, aggregate stats from DB
  return NextResponse.json([
    {
      session_id: params.player_id,
      total_games_played: 0,
      total_score: 0,
      average_score: 0,
      best_score: 0,
      completion_rate: 0,
      rewards_earned: [],
    },
  ]);
}
