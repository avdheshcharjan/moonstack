// API route to get referral statistics for a user

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';
import { getReferralStats, getBonusTier } from '@/src/services/referralBonusCalculator';

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

    // Get referral statistics
    const stats = await getReferralStats(wallet);

    // Get referral code
    const { data: userData } = await supabase
      .from('user_points')
      .select('referral_code')
      .eq('wallet_address', wallet)
      .single();

    const referralCode = userData?.referral_code || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://moonstack.fun';

    // Get list of referees (anonymized)
    const { data: referees } = await supabase
      .from('referrals')
      .select('referee_wallet, is_active, first_trade_at, total_trades_count, total_points_generated, created_at')
      .eq('referrer_wallet', wallet)
      .order('created_at', { ascending: false });

    const refereeList = referees?.map((ref) => ({
      wallet_address: anonymizeWallet(ref.referee_wallet),
      is_active: ref.is_active,
      first_trade_at: ref.first_trade_at,
      total_trades_count: ref.total_trades_count,
      points_generated: Number(ref.total_points_generated),
      joined_at: ref.created_at,
    })) || [];

    return NextResponse.json({
      total_referrals: stats.total_referrals,
      active_referrals: stats.active_referrals,
      inactive_referrals: stats.inactive_referrals,
      bonus_multiplier: stats.multiplier,
      bonus_tier: stats.bonus_tier,
      total_bonus_points: stats.total_bonus_points,
      referral_code: referralCode,
      referral_link: `${baseUrl}/ref/${referralCode}`,
      referees: refereeList,
    });
  } catch (error) {
    console.error('Error in /api/referrals/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Anonymize wallet address for privacy
 */
function anonymizeWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

