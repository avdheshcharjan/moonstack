// Generate weekly leaderboard snapshots

import { supabase } from '@/src/utils/supabase';

export interface WeeklyGenerationResult {
  week_number: number;
  season_id: string;
  entries_created: number;
  week_start: string;
  week_end: string;
  errors: string[];
}

/**
 * Generate weekly leaderboard snapshot for the completed week
 * Should be called every Sunday at 23:55 UTC
 * 
 * @returns Result with entry count and any errors
 */
export async function generateWeeklyLeaderboard(): Promise<WeeklyGenerationResult> {
  const result: WeeklyGenerationResult = {
    week_number: 0,
    season_id: '',
    entries_created: 0,
    week_start: '',
    week_end: '',
    errors: [],
  };

  try {
    // Get current active season
    const { data: activeSeason, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();

    if (seasonError || !activeSeason) {
      result.errors.push('No active season found');
      return result;
    }

    result.season_id = activeSeason.id;

    // Calculate which week we're in (1-12)
    const seasonStart = new Date(activeSeason.start_date);
    const now = new Date();
    const weeksSinceStart = Math.floor(
      (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    
    // We're generating for the week that just ended
    const completedWeekNumber = weeksSinceStart; // 0-indexed, so week 0 = week 1
    result.week_number = completedWeekNumber + 1;

    if (result.week_number < 1 || result.week_number > 12) {
      result.errors.push(`Invalid week number: ${result.week_number}`);
      return result;
    }

    // Calculate week boundaries
    const weekStart = new Date(seasonStart);
    weekStart.setDate(weekStart.getDate() + (completedWeekNumber * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    result.week_start = weekStart.toISOString();
    result.week_end = weekEnd.toISOString();

    // Check if this week's leaderboard has already been generated
    const { data: existing } = await supabase
      .from('weekly_leaderboard')
      .select('id')
      .eq('season_id', activeSeason.id)
      .eq('week_number', result.week_number)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Leaderboard for week ${result.week_number} already exists`);
      return result;
    }

    // Get all settled positions from this week
    const { data: weeklyPositions, error: positionsError } = await supabase
      .from('user_positions')
      .select('wallet_address, pnl')
      .eq('is_settled', true)
      .gte('settlement_timestamp', weekStart.toISOString())
      .lt('settlement_timestamp', weekEnd.toISOString());

    if (positionsError) {
      result.errors.push(`Error fetching positions: ${positionsError.message}`);
      return result;
    }

    if (!weeklyPositions || weeklyPositions.length === 0) {
      console.log(`No settled positions for week ${result.week_number}`);
      return result;
    }

    // Aggregate by wallet: calculate total profit and points
    const walletStats = new Map<string, { profit: number; points: number }>();

    weeklyPositions.forEach((position) => {
      const wallet = position.wallet_address;
      const pnl = Number(position.pnl) || 0;
      
      // Calculate points (same formula as pointsCalculator)
      let points = 0;
      if (pnl === 0) points = 5;
      else if (pnl > 0) points = Math.floor(pnl * 10);
      else points = Math.floor(Math.abs(pnl) * 2);

      if (walletStats.has(wallet)) {
        const stats = walletStats.get(wallet)!;
        stats.profit += pnl;
        stats.points += points;
      } else {
        walletStats.set(wallet, { profit: pnl, points });
      }
    });

    // Convert to array and sort by profit (descending)
    const leaderboard = Array.from(walletStats.entries())
      .map(([wallet, stats]) => ({
        wallet_address: wallet,
        weekly_profit_usd: stats.profit,
        weekly_points_earned: stats.points,
      }))
      .sort((a, b) => b.weekly_profit_usd - a.weekly_profit_usd);

    // Assign ranks
    const entries = leaderboard.map((entry, index) => ({
      wallet_address: entry.wallet_address,
      season_id: activeSeason.id,
      week_number: result.week_number,
      week_start_date: weekStart.toISOString(),
      week_end_date: weekEnd.toISOString(),
      weekly_profit_usd: entry.weekly_profit_usd,
      weekly_points_earned: entry.weekly_points_earned,
      rank: index + 1,
    }));

    // Batch insert leaderboard entries
    const { error: insertError } = await supabase
      .from('weekly_leaderboard')
      .insert(entries);

    if (insertError) {
      result.errors.push(`Error inserting leaderboard: ${insertError.message}`);
      return result;
    }

    result.entries_created = entries.length;

    console.log(`Generated weekly leaderboard for week ${result.week_number}:`, {
      entries: result.entries_created,
      top_3: entries.slice(0, 3),
    });

    // Refresh materialized view for current season leaderboard
    await supabase.rpc('refresh_current_season_leaderboard');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Fatal error: ${errorMessage}`);
    console.error('Fatal error in generateWeeklyLeaderboard:', error);
    return result;
  }
}

/**
 * Get the current week number within active season
 * 
 * @returns Week number (1-12) or null if no active season
 */
export async function getCurrentWeekNumber(): Promise<number | null> {
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('start_date')
    .eq('is_active', true)
    .single();

  if (!activeSeason) return null;

  const seasonStart = new Date(activeSeason.start_date);
  const now = new Date();
  const weeksSinceStart = Math.floor(
    (now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  const weekNumber = weeksSinceStart + 1;
  return weekNumber >= 1 && weekNumber <= 12 ? weekNumber : null;
}

