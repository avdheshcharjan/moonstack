// API route to validate and use a referral code

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, referee_wallet } = body;

    console.log(`🔍 Validating referral code: ${code} for wallet: ${referee_wallet}`);

    if (!code || !referee_wallet) {
      console.error('❌ Missing required parameters');
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

    console.log('📊 Referrer lookup result:', { 
      found: !!referrerData, 
      error: referrerError?.message,
      errorCode: referrerError?.code 
    });

    if (referrerError || !referrerData) {
      console.error('❌ Referral code not found in database:', {
        code,
        error: referrerError?.message,
        hint: 'Referrer may not have connected wallet yet or code does not exist'
      });
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid referral code',
          details: referrerError?.message || 'Code not found in database'
        },
        { status: 400 }
      );
    }

    console.log(`✅ Found referrer: ${referrerData.wallet_address}`);

    // Check if user is trying to refer themselves
    if (referrerData.wallet_address.toLowerCase() === referee_wallet.toLowerCase()) {
      console.warn('⚠️ User attempting self-referral');
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
      console.warn('⚠️ User has already used a referral code');
      return NextResponse.json(
        { 
          valid: false,
          error: 'You have already used a referral code',
        },
        { status: 400 }
      );
    }

    console.log('💾 Creating referral relationship...');

    // Create referral relationship
    console.log('💾 Attempting to insert referral into database:', {
      referrer_wallet: referrerData.wallet_address,
      referee_wallet: referee_wallet,
      referee_code_used: code
    });

    const { data: insertedData, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_wallet: referrerData.wallet_address,
        referee_wallet: referee_wallet,
        referee_code_used: code,
        is_active: false, // Will be activated on first trade
        total_trades_count: 0,
        total_points_generated: 0,
      })
      .select();

    if (insertError) {
      console.error('❌ Error creating referral:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.json(
        { 
          error: 'Failed to create referral relationship',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      );
    }

    console.log('✅ Referral relationship created successfully:', {
      inserted: insertedData,
      referrer: referrerData.wallet_address,
      referee: referee_wallet,
      code: code
    });

    // Ensure referee has a user_points record with referred_by field set
    console.log('🔍 Checking if referee has user_points record...');
    const { data: existingUserPoints } = await supabase
      .from('user_points')
      .select('wallet_address')
      .eq('wallet_address', referee_wallet)
      .single();

    if (existingUserPoints) {
      console.log('📝 Updating referred_by field for existing user...');
      // Update existing record with referred_by field
      const { error: updateError } = await supabase
        .from('user_points')
        .update({ referred_by: referrerData.wallet_address })
        .eq('wallet_address', referee_wallet);

      if (updateError) {
        console.error('❌ Error updating referred_by:', updateError);
        // Don't fail the whole operation, referral relationship is already created
      } else {
        console.log(`✅ Updated referred_by for ${referee_wallet} -> ${referrerData.wallet_address}`);
      }
    } else {
      console.log(`ℹ️ user_points record doesn't exist yet, will be created with referred_by on wallet connection`);
      // The ensureReferralCode endpoint will create this record with referred_by set
    }

    console.log('🎉 Referral validation complete!');

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

