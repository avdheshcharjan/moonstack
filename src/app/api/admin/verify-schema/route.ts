import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/verify-schema - Verify database schema setup
 * Returns detailed information about what tables/views exist
 */
export async function GET(request: NextRequest) {
  try {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tables: {},
      views: {},
      data_counts: {},
      status: 'unknown',
      issues: [],
      recommendations: [],
    };

    // Check if user_positions table exists
    const { data: userPositionsCheck, error: userPositionsError } = await supabase
      .from('user_positions')
      .select('id', { count: 'exact', head: true });

    if (userPositionsError) {
      if (userPositionsError.code === '42P01') {
        results.tables.user_positions = { exists: false };
        results.issues.push('user_positions table does not exist');
        results.recommendations.push('Create user_positions table first (trading system prerequisite)');
      } else {
        results.tables.user_positions = { exists: 'unknown', error: userPositionsError.message };
      }
    } else {
      results.tables.user_positions = { exists: true };
      
      // Get count
      const { count } = await supabase
        .from('user_positions')
        .select('*', { count: 'exact', head: true });
      results.data_counts.user_positions = count || 0;
    }

    // Check classic leaderboard view
    const { data: leaderboardCheck, error: leaderboardError } = await supabase
      .from('leaderboard')
      .select('wallet_address', { count: 'exact', head: true });

    if (leaderboardError) {
      if (leaderboardError.code === '42P01' || leaderboardError.message?.includes('does not exist')) {
        results.views.leaderboard = { exists: false };
        results.issues.push('Classic leaderboard view does not exist');
        results.recommendations.push('Run: supabase/migrations/complete_setup.sql');
      } else {
        results.views.leaderboard = { exists: 'unknown', error: leaderboardError.message };
      }
    } else {
      results.views.leaderboard = { exists: true };
      const { count } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true });
      results.data_counts.leaderboard_entries = count || 0;
    }

    // Check seasons table
    const { data: seasonsData, error: seasonsError } = await supabase
      .from('seasons')
      .select('*');

    if (seasonsError) {
      if (seasonsError.code === '42P01') {
        results.tables.seasons = { exists: false };
        results.issues.push('seasons table does not exist');
        results.recommendations.push('Run: supabase/migrations/complete_setup.sql');
      } else {
        results.tables.seasons = { exists: 'unknown', error: seasonsError.message };
      }
    } else {
      results.tables.seasons = { exists: true };
      results.data_counts.seasons = seasonsData?.length || 0;
      
      const activeSeason = seasonsData?.find((s: any) => s.is_active);
      if (activeSeason) {
        results.active_season = {
          id: activeSeason.id,
          season_number: activeSeason.season_number,
          start_date: activeSeason.start_date,
          end_date: activeSeason.end_date,
        };
      } else {
        results.issues.push('No active season found');
        results.recommendations.push('Create first season: POST /api/seasons/create with ADMIN_SECRET');
      }
    }

    // Check user_points table
    const { data: userPointsCheck, error: userPointsError } = await supabase
      .from('user_points')
      .select('wallet_address', { count: 'exact', head: true });

    if (userPointsError) {
      if (userPointsError.code === '42P01') {
        results.tables.user_points = { exists: false };
        results.issues.push('user_points table does not exist');
        results.recommendations.push('Run: supabase/migrations/complete_setup.sql');
      } else {
        results.tables.user_points = { exists: 'unknown', error: userPointsError.message };
      }
    } else {
      results.tables.user_points = { exists: true };
      const { count } = await supabase
        .from('user_points')
        .select('*', { count: 'exact', head: true });
      results.data_counts.user_points = count || 0;
    }

    // Check point_transactions table
    const { data: pointTxCheck, error: pointTxError } = await supabase
      .from('point_transactions')
      .select('id', { count: 'exact', head: true });

    if (pointTxError) {
      if (pointTxError.code === '42P01') {
        results.tables.point_transactions = { exists: false };
        results.issues.push('point_transactions table does not exist');
      } else {
        results.tables.point_transactions = { exists: 'unknown', error: pointTxError.message };
      }
    } else {
      results.tables.point_transactions = { exists: true };
      const { count } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true });
      results.data_counts.point_transactions = count || 0;
    }

    // Check referrals table
    const { data: referralsCheck, error: referralsError } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true });

    if (referralsError) {
      if (referralsError.code === '42P01') {
        results.tables.referrals = { exists: false };
        results.issues.push('referrals table does not exist');
      } else {
        results.tables.referrals = { exists: 'unknown', error: referralsError.message };
      }
    } else {
      results.tables.referrals = { exists: true };
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });
      results.data_counts.referrals = count || 0;
    }

    // Check weekly_leaderboard table
    const { data: weeklyCheck, error: weeklyError } = await supabase
      .from('weekly_leaderboard')
      .select('id', { count: 'exact', head: true });

    if (weeklyError) {
      if (weeklyError.code === '42P01') {
        results.tables.weekly_leaderboard = { exists: false };
        results.issues.push('weekly_leaderboard table does not exist');
      } else {
        results.tables.weekly_leaderboard = { exists: 'unknown', error: weeklyError.message };
      }
    } else {
      results.tables.weekly_leaderboard = { exists: true };
      const { count } = await supabase
        .from('weekly_leaderboard')
        .select('*', { count: 'exact', head: true });
      results.data_counts.weekly_leaderboard_snapshots = count || 0;
    }

    // Check current_season_leaderboard materialized view
    const { data: seasonLeaderboardCheck, error: seasonLeaderboardError } = await supabase
      .from('current_season_leaderboard')
      .select('wallet_address', { count: 'exact', head: true });

    if (seasonLeaderboardError) {
      if (seasonLeaderboardError.code === '42P01') {
        results.views.current_season_leaderboard = { exists: false };
        results.issues.push('current_season_leaderboard materialized view does not exist');
      } else {
        results.views.current_season_leaderboard = { exists: 'unknown', error: seasonLeaderboardError.message };
      }
    } else {
      results.views.current_season_leaderboard = { exists: true };
      const { count } = await supabase
        .from('current_season_leaderboard')
        .select('*', { count: 'exact', head: true });
      results.data_counts.current_season_leaderboard = count || 0;
    }

    // Determine overall status
    const criticalIssues = results.issues.filter((issue: string) => 
      issue.includes('seasons') || 
      issue.includes('user_points') || 
      issue.includes('point_transactions')
    );

    if (criticalIssues.length > 0) {
      results.status = 'critical';
    } else if (results.issues.length > 0) {
      results.status = 'partial';
    } else {
      results.status = 'healthy';
    }

    // Add summary
    results.summary = {
      total_issues: results.issues.length,
      critical_issues: criticalIssues.length,
      tables_checked: Object.keys(results.tables).length,
      views_checked: Object.keys(results.views).length,
    };

    return NextResponse.json(results, { 
      status: results.status === 'critical' ? 503 : 200 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying schema:', errorMessage);
    return NextResponse.json(
      { 
        error: 'Failed to verify schema', 
        message: errorMessage,
        status: 'error',
      },
      { status: 500 }
    );
  }
}

