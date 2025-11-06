// API route to create a new 12-week season (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { start_date } = body;

    // Validate start date
    let startDate: Date;
    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start_date format' },
          { status: 400 }
        );
      }
    } else {
      startDate = new Date();
    }

    // Calculate end date (12 weeks = 84 days)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 84);

    // Deactivate current active season
    await supabase
      .from('seasons')
      .update({ is_active: false })
      .eq('is_active', true);

    // Get next season number
    const { data: lastSeason } = await supabase
      .from('seasons')
      .select('season_number')
      .order('season_number', { ascending: false })
      .limit(1)
      .single();

    const seasonNumber = (lastSeason?.season_number || 0) + 1;

    // Create new season
    const { data: newSeason, error } = await supabase
      .from('seasons')
      .insert({
        season_number: seasonNumber,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating season:', error);
      return NextResponse.json(
        { error: 'Failed to create season' },
        { status: 500 }
      );
    }

    // Update all users' current_season_id and reset season points
    await supabase
      .from('user_points')
      .update({
        current_season_id: newSeason.id,
        current_season_points: 0,
      })
      .neq('wallet_address', ''); // Update all records

    return NextResponse.json({
      success: true,
      season: newSeason,
      message: `Season ${seasonNumber} created successfully`,
    });
  } catch (error) {
    console.error('Error in /api/seasons/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

