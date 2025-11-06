// API route to get weekly leaderboard

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const weekNumber = searchParams.get('week_number');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!seasonId || !weekNumber) {
      return NextResponse.json(
        { error: 'season_id and week_number are required' },
        { status: 400 }
      );
    }

    const weekNum = parseInt(weekNumber);
    if (weekNum < 1 || weekNum > 12) {
      return NextResponse.json(
        { error: 'week_number must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Get weekly leaderboard entries
    const { data: entries, error } = await supabase
      .from('weekly_leaderboard')
      .select('*')
      .eq('season_id', seasonId)
      .eq('week_number', weekNum)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching weekly leaderboard:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      season_id: seasonId,
      week_number: weekNum,
      entries: entries?.map((entry) => ({
        ...entry,
        weekly_profit_usd: Number(entry.weekly_profit_usd),
        weekly_points_earned: Number(entry.weekly_points_earned),
      })) || [],
      total_entries: entries?.length || 0,
    });
  } catch (error) {
    console.error('Error in /api/leaderboard/weekly:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

