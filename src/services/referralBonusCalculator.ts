// Referral bonus calculation service with tiered multipliers

import { supabase } from '@/src/utils/supabase';

export type BonusTier = 'FLAT' | 'TIER_1' | 'TIER_2';

export interface ReferralBonusResult {
  bonus_points: number;
  bonus_tier: BonusTier;
  multiplier: number;
  active_referrals_count: number;
}

/**
 * Get bonus tier and multiplier based on active referrals count
 * 
 * Tiers:
 * - < 10 active referrals: FLAT (100 points per new active referee)
 * - >= 10 active referrals: TIER_1 (1.2x multiplier on referee points)
 * - >= 30 active referrals: TIER_2 (1.5x multiplier on referee points)
 * 
 * @param activeReferralsCount - Number of active referrals
 * @returns Bonus tier and multiplier
 */
export function getBonusTier(activeReferralsCount: number): {
  tier: BonusTier;
  multiplier: number;
} {
  if (activeReferralsCount >= 30) {
    return { tier: 'TIER_2', multiplier: 1.5 };
  }
  if (activeReferralsCount >= 10) {
    return { tier: 'TIER_1', multiplier: 1.2 };
  }
  return { tier: 'FLAT', multiplier: 0 }; // Flat bonus, not a multiplier
}

/**
 * Calculate referral bonus for a referrer when their referee earns points
 * 
 * @param referrerWallet - Wallet address of the referrer
 * @param refereePoints - Points earned by the referee
 * @param isFirstTrade - Whether this is the referee's first trade (activation)
 * @returns Bonus points and tier info
 */
export async function calculateReferralBonus(
  referrerWallet: string,
  refereePoints: number,
  isFirstTrade: boolean = false
): Promise<ReferralBonusResult> {
  // Fetch referrer's current active referrals count
  const { data: referrerData, error } = await supabase
    .from('user_points')
    .select('active_referrals_count')
    .eq('wallet_address', referrerWallet)
    .single();

  if (error || !referrerData) {
    console.error('Error fetching referrer data:', error);
    return {
      bonus_points: 0,
      bonus_tier: 'FLAT',
      multiplier: 0,
      active_referrals_count: 0,
    };
  }

  const activeReferralsCount = referrerData.active_referrals_count;
  const { tier, multiplier } = getBonusTier(activeReferralsCount);

  let bonusPoints = 0;

  if (tier === 'FLAT') {
    // Flat bonus: 100 points when a new referee becomes active
    if (isFirstTrade) {
      bonusPoints = 100;
    } else {
      // No ongoing bonus in FLAT tier
      bonusPoints = 0;
    }
  } else {
    // Multiplier tiers: apply multiplier to referee's points
    bonusPoints = Math.floor(refereePoints * multiplier);
  }

  return {
    bonus_points: bonusPoints,
    bonus_tier: tier,
    multiplier: tier === 'FLAT' ? 0 : multiplier,
    active_referrals_count: activeReferralsCount,
  };
}

/**
 * Calculate what the bonus would be at different tiers (for display)
 * 
 * @param refereePoints - Points earned by referee
 * @returns Bonus amounts at each tier
 */
export function calculateBonusAtAllTiers(refereePoints: number): {
  flat: number;
  tier_1: number;
  tier_2: number;
} {
  return {
    flat: 100, // One-time bonus per active referee
    tier_1: Math.floor(refereePoints * 1.2),
    tier_2: Math.floor(refereePoints * 1.5),
  };
}

/**
 * Get referral statistics for display
 * 
 * @param referrerWallet - Wallet address of the referrer
 * @returns Statistics about referrals and bonuses
 */
export async function getReferralStats(referrerWallet: string): Promise<{
  total_referrals: number;
  active_referrals: number;
  inactive_referrals: number;
  bonus_tier: BonusTier;
  multiplier: number;
  total_bonus_points: number;
}> {
  // Get total and active referrals count
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('is_active')
    .eq('referrer_wallet', referrerWallet);

  if (referralsError) {
    console.error('Error fetching referrals:', referralsError);
    return {
      total_referrals: 0,
      active_referrals: 0,
      inactive_referrals: 0,
      bonus_tier: 'FLAT',
      multiplier: 0,
      total_bonus_points: 0,
    };
  }

  const totalReferrals = referrals?.length || 0;
  const activeReferrals = referrals?.filter(r => r.is_active).length || 0;
  const inactiveReferrals = totalReferrals - activeReferrals;

  const { tier, multiplier } = getBonusTier(activeReferrals);

  // Get total bonus points earned
  const { data: bonusTransactions, error: bonusError } = await supabase
    .from('point_transactions')
    .select('points_earned')
    .eq('wallet_address', referrerWallet)
    .eq('transaction_type', 'REFERRAL_BONUS');

  const totalBonusPoints = bonusTransactions?.reduce(
    (sum, tx) => sum + Number(tx.points_earned),
    0
  ) || 0;

  return {
    total_referrals: totalReferrals,
    active_referrals: activeReferrals,
    inactive_referrals: inactiveReferrals,
    bonus_tier: tier,
    multiplier: tier === 'FLAT' ? 0 : multiplier,
    total_bonus_points: totalBonusPoints,
  };
}

