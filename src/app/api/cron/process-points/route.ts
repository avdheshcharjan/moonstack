// Cron job endpoint to process settled positions and award points
// Should be called every 15 minutes by external cron service

import { NextRequest, NextResponse } from 'next/server';
import { processSettledPositions } from '@/src/services/pointsProcessor';

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

    console.log('Starting points processing cron job...');
    const startTime = Date.now();

    // Process all settled positions
    const result = await processSettledPositions();

    const duration = Date.now() - startTime;

    console.log('Points processing complete:', {
      ...result,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/cron/process-points:', error);
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
    endpoint: '/api/cron/process-points',
    description: 'Points processing cron job',
    schedule: 'Every 15 minutes',
  });
}

