/**
 * Referral Service
 * Handles automatic referral code generation and retrieval
 */

import { supabase } from '@/src/utils/supabase';
import { generateCodeFromWallet } from '@/src/utils/codeGenerator';

/**
 * Ensures a wallet has a referral code, generating one if needed
 * This is idempotent - safe to call multiple times
 * 
 * @param walletAddress - The user's wallet address
 * @returns The referral code (existing or newly generated)
 */
export async function ensureReferralCode(
  walletAddress: string
): Promise<{ code: string; isNew: boolean } | null> {
  try {
    if (!walletAddress) {
      console.error('ensureReferralCode: No wallet address provided');
      return null;
    }

    // Check if user already has a referral code
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_points')
      .select('referral_code')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected for new users
      console.error('Error checking existing referral code:', fetchError);
      return null;
    }

    // User already has a code
    if (existingUser?.referral_code) {
      return {
        code: existingUser.referral_code,
        isNew: false,
      };
    }

    // Generate deterministic code from wallet address
    // This ensures: same wallet = same code, no collisions
    const code = await generateCodeFromWallet(walletAddress, 6);
    console.log(`Generated deterministic code ${code} for wallet ${walletAddress}`);

    // Get current active season (if any)
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    // Check if user has a pending referral (from /ref/[code] page)
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('referrer_wallet')
      .eq('referee_wallet', walletAddress)
      .single();

    // Insert new user_points record with generated code
    const { data: newUser, error: insertError } = await supabase
      .from('user_points')
      .insert({
        wallet_address: walletAddress,
        referral_code: code,
        total_points: 0,
        current_season_points: 0,
        current_season_id: activeSeason?.id || null,
        active_referrals_count: 0,
        referred_by: existingReferral?.referrer_wallet || null, // Set referred_by if they used a code
      })
      .select('referral_code')
      .single();

    if (insertError) {
      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505') {
        // Someone else just created this user, fetch their code
        const { data: racedUser } = await supabase
          .from('user_points')
          .select('referral_code')
          .eq('wallet_address', walletAddress)
          .single();

        if (racedUser?.referral_code) {
          return {
            code: racedUser.referral_code,
            isNew: false,
          };
        }
      }

      console.error('Error inserting new user_points:', insertError);
      return null;
    }

    console.log(`Generated new referral code for ${walletAddress}: ${code}`);

    return {
      code: newUser?.referral_code || code,
      isNew: true,
    };
  } catch (error) {
    console.error('Unexpected error in ensureReferralCode:', error);
    return null;
  }
}

/**
 * Get the referral link for a wallet address
 * 
 * @param walletAddress - The user's wallet address
 * @param baseUrl - Optional base URL (defaults to current origin)
 * @returns The full referral link or null if code doesn't exist
 */
export async function getReferralLink(
  walletAddress: string,
  baseUrl?: string
): Promise<string | null> {
  const result = await ensureReferralCode(walletAddress);
  
  if (!result) {
    return null;
  }

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  // Changed from /ref/CODE to /?ref=CODE for streamlined sign-in flow
  return `${origin}?ref=${result.code}`;
}

/**
 * Validate that a referral code exists and is not the user's own code
 * 
 * @param code - The referral code to validate
 * @param refereeWallet - The wallet address of the person using the code
 * @returns Object with validation result and referrer wallet if valid
 */
export async function validateReferralCode(
  code: string,
  refereeWallet: string
): Promise<{ 
  valid: boolean; 
  referrerWallet?: string; 
  error?: string 
}> {
  try {
    // Find the owner of this referral code
    const { data: referrer, error: fetchError } = await supabase
      .from('user_points')
      .select('wallet_address')
      .eq('referral_code', code)
      .single();

    if (fetchError || !referrer) {
      return {
        valid: false,
        error: 'Invalid referral code',
      };
    }

    // Check if user is trying to use their own code
    if (referrer.wallet_address.toLowerCase() === refereeWallet.toLowerCase()) {
      return {
        valid: false,
        error: 'Cannot use your own referral code',
      };
    }

    // Check if user has already used a referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_wallet', refereeWallet)
      .single();

    if (existingReferral) {
      return {
        valid: false,
        error: 'You have already used a referral code',
      };
    }

    return {
      valid: true,
      referrerWallet: referrer.wallet_address,
    };
  } catch (error) {
    console.error('Error validating referral code:', error);
    return {
      valid: false,
      error: 'Failed to validate referral code',
    };
  }
}

