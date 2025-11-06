// Batch process settled positions and award points

import { supabase } from '@/src/utils/supabase';
import { calculateTradePoints } from './pointsCalculator';
import { calculateReferralBonus } from './referralBonusCalculator';
import { DbUserPosition } from '@/src/utils/supabase';

export interface ProcessingResult {
  processed_count: number;
  points_awarded: number;
  referral_bonuses_awarded: number;
  errors: string[];
}

/**
 * Batch process all unprocessed settled positions and award points
 * This function should be called by a cron job every 15 minutes
 * 
 * @returns Processing results with counts and errors
 */
export async function processSettledPositions(): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed_count: 0,
    points_awarded: 0,
    referral_bonuses_awarded: 0,
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

    // Fetch all unprocessed settled positions
    const { data: positions, error: positionsError } = await supabase
      .from('user_positions')
      .select('*')
      .eq('is_settled', true)
      .eq('points_processed', false)
      .order('settlement_timestamp', { ascending: true });

    if (positionsError) {
      result.errors.push(`Error fetching positions: ${positionsError.message}`);
      return result;
    }

    if (!positions || positions.length === 0) {
      console.log('No unprocessed positions found');
      return result;
    }

    console.log(`Processing ${positions.length} settled positions...`);

    // Process each position
    for (const position of positions) {
      try {
        await processPosition(position as DbUserPosition, activeSeason.id, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing position ${position.id}: ${errorMessage}`);
        console.error(`Error processing position ${position.id}:`, error);
      }
    }

    console.log('Processing complete:', result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Fatal error: ${errorMessage}`);
    console.error('Fatal error in processSettledPositions:', error);
    return result;
  }
}

/**
 * Process a single position: calculate points, award to trader and referrer
 */
async function processPosition(
  position: DbUserPosition,
  seasonId: string,
  result: ProcessingResult
): Promise<void> {
  const walletAddress = position.wallet_address;

  // Step 1: Calculate trade points
  const tradePoints = calculateTradePoints(position);
  
  if (tradePoints <= 0) {
    console.log(`No points to award for position ${position.id}`);
    return;
  }

  // Step 2: Ensure user_points record exists
  await ensureUserPointsRecord(walletAddress, seasonId);

  // Step 3: Check if user has a referrer
  const { data: referralData } = await supabase
    .from('referrals')
    .select('referrer_wallet, is_active, total_trades_count')
    .eq('referee_wallet', walletAddress)
    .single();

  const isFirstTrade = referralData && !referralData.is_active;

  // Step 4: Award points to trader
  await awardPoints(
    walletAddress,
    tradePoints,
    'TRADE',
    seasonId,
    {
      profit_usd: Number(position.pnl),
      position_id: position.id,
      tx_hash: position.tx_hash,
    },
    position.tx_hash,
    position.id
  );

  result.processed_count++;
  result.points_awarded += tradePoints;

  // Step 5: If user has referrer, calculate and award referral bonus
  if (referralData) {
    const bonusResult = await calculateReferralBonus(
      referralData.referrer_wallet,
      tradePoints,
      isFirstTrade || false
    );

    if (bonusResult.bonus_points > 0) {
      await awardPoints(
        referralData.referrer_wallet,
        bonusResult.bonus_points,
        'REFERRAL_BONUS',
        seasonId,
        {
          referee_wallet: walletAddress,
          referee_points: tradePoints,
          bonus_tier: bonusResult.bonus_tier,
          multiplier: bonusResult.multiplier,
        }
      );

      result.referral_bonuses_awarded += bonusResult.bonus_points;

      // Update referral record - accumulate referee's points that generated bonuses
      // Note: total_points_generated tracks the referee's points that resulted in bonuses
      await supabase
        .from('referrals')
        .update({
          total_points_generated: (Number(referralData.total_points_generated) || 0) + tradePoints,
        })
        .eq('referee_wallet', walletAddress);
    }

    // Step 6: If this is first trade, activate the referral
    if (isFirstTrade) {
      await supabase
        .from('referrals')
        .update({
          is_active: true,
          first_trade_at: new Date().toISOString(),
          total_trades_count: 1,
        })
        .eq('referee_wallet', walletAddress);

      // Increment referrer's active_referrals_count
      await supabase.rpc('increment_active_referrals', {
        referrer_address: referralData.referrer_wallet,
      });
    } else if (referralData.is_active) {
      // Increment trade count for active referral
      await supabase
        .from('referrals')
        .update({
          total_trades_count: (referralData.total_trades_count || 0) + 1,
        })
        .eq('referee_wallet', walletAddress);
    }
  }

  // Step 7: Mark position as processed
  await supabase
    .from('user_positions')
    .update({ points_processed: true })
    .eq('id', position.id);
}

/**
 * Ensure user has a record in user_points table
 */
async function ensureUserPointsRecord(
  walletAddress: string,
  seasonId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('user_points')
    .select('wallet_address')
    .eq('wallet_address', walletAddress)
    .single();

  if (!existing) {
    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();
    
    await supabase
      .from('user_points')
      .insert({
        wallet_address: walletAddress,
        total_points: 0,
        current_season_points: 0,
        current_season_id: seasonId,
        referral_code: referralCode,
        active_referrals_count: 0,
      });
  }
}

/**
 * Award points to a user and record transaction
 */
async function awardPoints(
  walletAddress: string,
  points: number,
  transactionType: 'TRADE' | 'REFERRAL_BONUS' | 'ADMIN_ADJUSTMENT',
  seasonId: string,
  metadata: any,
  sourceTxHash?: string,
  sourcePositionId?: string
): Promise<void> {
  // Insert point transaction
  await supabase
    .from('point_transactions')
    .insert({
      wallet_address: walletAddress,
      points_earned: points,
      transaction_type: transactionType,
      source_tx_hash: sourceTxHash,
      source_position_id: sourcePositionId,
      metadata: metadata,
      season_id: seasonId,
    });

  // Update user_points totals
  await supabase.rpc('increment_user_points', {
    user_wallet: walletAddress,
    points_to_add: points,
    season_id: seasonId,
  });
}

/**
 * Generate a unique 6-character alphanumeric referral code
 */
async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const { data } = await supabase
      .from('user_points')
      .select('referral_code')
      .eq('referral_code', code)
      .single();

    if (!data) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique referral code');
}

