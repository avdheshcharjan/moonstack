// API route to generate referral code for a user

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'wallet_address is required' },
        { status: 400 }
      );
    }

    // Check if user already has a referral code
    const { data: existing, error: existingError } = await supabase
      .from('user_points')
      .select('referral_code')
      .eq('wallet_address', wallet_address)
      .single();

    if (existing && existing.referral_code) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://moonstack.fun';
      return NextResponse.json({
        code: existing.referral_code,
        wallet_address,
        referral_link: `${baseUrl}/ref/${existing.referral_code}`,
      });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Get current active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    const seasonId = activeSeason?.id || null;

    // Create user_points record with referral code
    const { error: insertError } = await supabase
      .from('user_points')
      .insert({
        wallet_address,
        total_points: 0,
        current_season_points: 0,
        current_season_id: seasonId,
        referral_code: referralCode,
        active_referrals_count: 0,
      });

    if (insertError) {
      console.error('Error creating user_points record:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate referral code' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://moonstack.fun';
    return NextResponse.json({
      code: referralCode,
      wallet_address,
      referral_link: `${baseUrl}/ref/${referralCode}`,
    });
  } catch (error) {
    console.error('Error in /api/referrals/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique 6-character alphanumeric referral code
 */
async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = '';
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
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique referral code after ' + maxAttempts + ' attempts');
}

