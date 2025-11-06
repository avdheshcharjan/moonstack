// API route to validate and use a referral code

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, referee_wallet } = body;

    if (!code || !referee_wallet) {
      return NextResponse.json(
        { error: 'code and referee_wallet are required' },
        { status: 400 }
      );
    }

    // Check if referral code exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('user_points')
      .select('wallet_address, referral_code')
      .eq('referral_code', code)
      .single();

    if (referrerError || !referrerData) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid referral code',
        },
        { status: 400 }
      );
    }

    // Check if user is trying to refer themselves
    if (referrerData.wallet_address.toLowerCase() === referee_wallet.toLowerCase()) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Cannot use your own referral code',
        },
        { status: 400 }
      );
    }

    // Check if referee has already used a referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_wallet', referee_wallet)
      .single();

    if (existingReferral) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'You have already used a referral code',
        },
        { status: 400 }
      );
    }

    // Create referral relationship
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_wallet: referrerData.wallet_address,
        referee_wallet: referee_wallet,
        referee_code_used: code,
        is_active: false, // Will be activated on first trade
        total_trades_count: 0,
        total_points_generated: 0,
      });

    if (insertError) {
      console.error('Error creating referral:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid: true,
      code,
      referrer_wallet: referrerData.wallet_address,
      message: 'Referral code applied successfully. Complete your first trade to activate!',
    });
  } catch (error) {
    console.error('Error in /api/referrals/validate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

