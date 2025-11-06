// API route to ensure a wallet has a referral code in the database
// This is called automatically on wallet connection

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';
import { generateCodeFromWallet } from '@/src/utils/codeGenerator';

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

    console.log(`🔍 Checking referral code for wallet: ${wallet_address}`);

    // Check if user already has a referral code
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_points')
      .select('referral_code, wallet_address')
      .eq('wallet_address', wallet_address)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new users
      console.error('Error checking existing user:', fetchError);
      return NextResponse.json(
        { error: 'Database error while checking user' },
        { status: 500 }
      );
    }

    // User already has a code
    if (existingUser?.referral_code) {
      console.log(`✅ Existing referral code found: ${existingUser.referral_code}`);
      return NextResponse.json({
        code: existingUser.referral_code,
        isNew: false,
        message: 'Referral code already exists',
      });
    }

    // Generate deterministic code from wallet address
    // This ensures: same wallet = same code, no collisions
    console.log(`🎲 Generating deterministic code from wallet address...`);
    const code = await generateCodeFromWallet(wallet_address, 6);
    console.log(`🆕 Generated code: ${code}`);

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
      .eq('referee_wallet', wallet_address)
      .single();

    // Create user_points record with the new code
    const { data: newUser, error: insertError } = await supabase
      .from('user_points')
      .insert({
        wallet_address: wallet_address,
        referral_code: code,
        total_points: 0,
        current_season_points: 0,
        current_season_id: activeSeason?.id || null,
        active_referrals_count: 0,
        referred_by: existingReferral?.referrer_wallet || null,
      })
      .select('referral_code')
      .single();

    if (insertError) {
      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505') {
        console.log('⚠️ Race condition detected, fetching existing code...');
        // This is expected behavior - the code is deterministic,
        // so if there's a race condition, both requests generated the same code
        const { data: raceUser } = await supabase
          .from('user_points')
          .select('referral_code')
          .eq('wallet_address', wallet_address)
          .single();

        if (raceUser?.referral_code) {
          return NextResponse.json({
            code: raceUser.referral_code,
            isNew: false,
            message: 'Referral code already exists (race condition handled)',
          });
        }
      }

      console.error('Error creating user_points record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral code', details: insertError },
        { status: 500 }
      );
    }

    console.log(`✨ Successfully created referral code: ${code} for ${wallet_address}`);

    return NextResponse.json({
      code: newUser?.referral_code || code,
      isNew: true,
      message: 'Referral code generated successfully',
    });
  } catch (error) {
    console.error('Unexpected error in /api/referrals/ensure-code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

