// API route to get paginated points transaction history

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Optional filter by type

    if (!wallet) {
      return NextResponse.json(
        { error: 'wallet parameter is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('point_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_address', wallet);

    // Apply type filter if provided
    if (type && ['TRADE', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT'].includes(type)) {
      query = query.eq('transaction_type', type);
    }

    // Apply pagination and ordering
    const { data: transactions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transaction history' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      transactions: transactions?.map((tx) => ({
        ...tx,
        points_earned: Number(tx.points_earned),
      })) || [],
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('Error in /api/points/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

