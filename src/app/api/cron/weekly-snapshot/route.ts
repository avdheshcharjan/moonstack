// Cron job endpoint to generate weekly leaderboard snapshot
// Should be called every Sunday at 23:55 UTC

import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyLeaderboard } from '@/src/services/weeklyLeaderboardGenerator';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting weekly leaderboard generation...');
    const startTime = Date.now();

    // Generate weekly leaderboard
    const result = await generateWeeklyLeaderboard();

    const duration = Date.now() - startTime;

    console.log('Weekly leaderboard generation complete:', {
      ...result,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/cron/weekly-snapshot:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/cron/weekly-snapshot',
    description: 'Weekly leaderboard snapshot generation',
    schedule: 'Every Sunday at 23:55 UTC',
  });
}

