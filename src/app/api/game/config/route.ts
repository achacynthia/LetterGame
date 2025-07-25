import { NextRequest, NextResponse } from 'next/server';
import { db } from '../db';

// Placeholder for game configuration data
const defaultConfig = {
  rounds: [], // TODO: Fill with actual rounds data
  max_attempts: 5,
};

export async function GET() {
  return NextResponse.json(db.config);
}
