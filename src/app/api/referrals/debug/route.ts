// Debug endpoint to check if referral was saved to database
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    
    if (!wallet) {
      return NextResponse.json({ error: 'wallet parameter required' }, { status: 400 });
    }
    
    console.log('🔍 Checking referral for wallet:', wallet);
    
    // Check if referral exists as referee
    const { data: asReferee, error: refereeError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_wallet', wallet);
    
    // Check if they have referred others
    const { data: asReferrer, error: referrerError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_wallet', wallet);
    
    // Check user_points record
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('wallet_address', wallet)
      .single();
    
    return NextResponse.json({
      wallet,
      asReferee: {
        exists: !!asReferee && asReferee.length > 0,
        count: asReferee?.length || 0,
        data: asReferee,
        error: refereeError
      },
      asReferrer: {
        exists: !!asReferrer && asReferrer.length > 0,
        count: asReferrer?.length || 0,
        data: asReferrer,
        error: referrerError
      },
      userPoints: {
        exists: !!userPoints,
        data: userPoints,
        error: pointsError
      }
    });
  } catch (error) {
    console.error('Error in /api/referrals/debug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

