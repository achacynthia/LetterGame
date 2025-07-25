import { db } from '../db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { player_id } = await req.json();
    
    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }
    
    // Create new session with its own config
    const newSession = db.createSession(player_id);
    
    console.log('Creating session with ID:', newSession.id);
    console.log('Session config has', newSession.config.rounds.length, 'rounds');
    console.log('Total sessions:', db.sessions.size);
    
    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
