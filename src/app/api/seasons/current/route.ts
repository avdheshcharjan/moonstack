// API route to get current active season information

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get current active season
    const { data: activeSeason, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      // No active season found
      return NextResponse.json({
        current_season: null,
        weeks_remaining: 0,
        current_week_number: 0,
        days_until_end: 0,
        message: 'No active season',
      });
    }

    if (!activeSeason) {
      return NextResponse.json({
        current_season: null,
        weeks_remaining: 0,
        current_week_number: 0,
        days_until_end: 0,
        message: 'No active season',
      });
    }

    const now = new Date();
    const startDate = new Date(activeSeason.start_date);
    const endDate = new Date(activeSeason.end_date);

    // Calculate current week number (1-12)
    const weeksSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const currentWeekNumber = Math.min(weeksSinceStart + 1, 12);

    // Calculate weeks remaining
    const weeksRemaining = 12 - currentWeekNumber;

    // Calculate days until end
    const daysUntilEnd = Math.ceil(
      (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      current_season: {
        id: activeSeason.id,
        season_number: activeSeason.season_number,
        start_date: activeSeason.start_date,
        end_date: activeSeason.end_date,
        is_active: activeSeason.is_active,
        created_at: activeSeason.created_at,
      },
      weeks_remaining: Math.max(weeksRemaining, 0),
      current_week_number: currentWeekNumber,
      days_until_end: Math.max(daysUntilEnd, 0),
    });
  } catch (error) {
    console.error('Error in /api/seasons/current:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

