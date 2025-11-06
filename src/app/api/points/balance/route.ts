// API route to get points balance and rank for a user

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'wallet parameter is required' },
        { status: 400 }
      );
    }

    // Get user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('wallet_address', wallet)
      .single();

    if (pointsError || !userPoints) {
      // User doesn't have points yet
      return NextResponse.json({
        wallet_address: wallet,
        total_points: 0,
        current_season_points: 0,
        rank: null,
        season_rank: null,
        breakdown: {
          trade_points: 0,
          referral_bonus_points: 0,
          adjustment_points: 0,
        },
      });
    }

    // Get all-time rank
    const { data: allTimeRankData } = await supabase
      .from('user_points')
      .select('wallet_address')
      .gt('total_points', userPoints.total_points)
      .order('total_points', { ascending: false });

    const allTimeRank = (allTimeRankData?.length || 0) + 1;

    // Get season rank
    const { data: seasonRankData } = await supabase
      .from('user_points')
      .select('wallet_address')
      .gt('current_season_points', userPoints.current_season_points)
      .eq('current_season_id', userPoints.current_season_id)
      .order('current_season_points', { ascending: false });

    const seasonRank = (seasonRankData?.length || 0) + 1;

    // Get points breakdown by transaction type
    const { data: transactions } = await supabase
      .from('point_transactions')
      .select('transaction_type, points_earned')
      .eq('wallet_address', wallet);

    const breakdown = {
      trade_points: 0,
      referral_bonus_points: 0,
      adjustment_points: 0,
    };

    transactions?.forEach((tx) => {
      const points = Number(tx.points_earned);
      if (tx.transaction_type === 'TRADE') {
        breakdown.trade_points += points;
      } else if (tx.transaction_type === 'REFERRAL_BONUS') {
        breakdown.referral_bonus_points += points;
      } else if (tx.transaction_type === 'ADMIN_ADJUSTMENT') {
        breakdown.adjustment_points += points;
      }
    });

    return NextResponse.json({
      wallet_address: wallet,
      total_points: Number(userPoints.total_points),
      current_season_points: Number(userPoints.current_season_points),
      rank: allTimeRank,
      season_rank: seasonRank,
      breakdown,
    });
  } catch (error) {
    console.error('Error in /api/points/balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

