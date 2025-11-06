// API route to get season leaderboard (by points)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const limit = parseInt(searchParams.get('limit') || '100');

    // If no season_id provided, get current active season
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!activeSeason) {
        return NextResponse.json({
          season_id: null,
          entries: [],
          total_entries: 0,
          message: 'No active season',
        });
      }

      targetSeasonId = activeSeason.id;
    }

    // Use materialized view for current season or query for specific season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    let entries;

    if (activeSeason && targetSeasonId === activeSeason.id) {
      // Use materialized view for current season (faster)
      const { data, error } = await supabase
        .from('current_season_leaderboard')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Error fetching from materialized view:', error);
        // Fallback to regular query
        entries = await fetchSeasonLeaderboard(targetSeasonId, limit);
      } else {
        entries = data;
      }
    } else {
      // Query historical season
      entries = await fetchSeasonLeaderboard(targetSeasonId, limit);
    }

    return NextResponse.json({
      season_id: targetSeasonId,
      entries: entries?.map((entry) => ({
        ...entry,
        current_season_points: Number(entry.current_season_points),
        total_profit: Number(entry.total_profit || 0),
      })) || [],
      total_entries: entries?.length || 0,
    });
  } catch (error) {
    console.error('Error in /api/leaderboard/season:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch season leaderboard using regular query
 */
async function fetchSeasonLeaderboard(seasonId: string, limit: number) {
  const { data: entries } = await supabase
    .from('user_points')
    .select(`
      wallet_address,
      current_season_points,
      active_referrals_count
    `)
    .eq('current_season_id', seasonId)
    .order('current_season_points', { ascending: false })
    .limit(limit);

  // Get additional stats from user_positions
  const enrichedEntries = await Promise.all(
    (entries || []).map(async (entry, index) => {
      const { data: positions } = await supabase
        .from('user_positions')
        .select('pnl, is_settled')
        .eq('wallet_address', entry.wallet_address);

      const totalTrades = positions?.length || 0;
      const winningTrades = positions?.filter(
        (p) => p.is_settled && Number(p.pnl) > 0
      ).length || 0;
      const totalProfit = positions?.reduce(
        (sum, p) => sum + (p.is_settled ? Number(p.pnl) : 0),
        0
      ) || 0;

      return {
        wallet_address: entry.wallet_address,
        current_season_points: entry.current_season_points,
        active_referrals_count: entry.active_referrals_count,
        total_trades: totalTrades,
        winning_trades: winningTrades,
        total_profit: totalProfit,
        rank: index + 1,
      };
    })
  );

  return enrichedEntries;
}

