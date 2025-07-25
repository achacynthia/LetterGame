import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // In a real app, aggregate leaderboard from DB
  return NextResponse.json([
    // Example leaderboard data
  ]);
}
