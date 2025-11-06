import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard - Fetch leaderboard data
 * Query params:
 *   - limit: number of entries to return (default: 100)
 *   - orderBy: 'total_pnl' | 'win_rate' | 'roi_percentage' (default: 'total_pnl')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const orderBy = searchParams.get('orderBy') || 'total_pnl';

    // Validate orderBy parameter
    const validOrderBy = ['total_pnl', 'win_rate', 'roi_percentage', 'total_bets'];
    if (!validOrderBy.includes(orderBy)) {
      return NextResponse.json(
        { error: 'Invalid orderBy parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order(orderBy as string, { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase query error:', error);
      
      // Provide helpful error message if view doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Classic leaderboard not set up', 
            details: 'The classic leaderboard view has not been created yet. Please run the complete_setup.sql migration in Supabase.',
            code: 'LEADERBOARD_NOT_SETUP',
            setupInstructions: 'Run: supabase/migrations/complete_setup.sql'
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    // Return empty array if no data (instead of error)
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching leaderboard:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', message: errorMessage },
      { status: 500 }
    );
  }
}
