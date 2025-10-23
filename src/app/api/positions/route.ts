import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/utils/supabase';
import { UserPosition } from '@/src/types/orders';

export const dynamic = 'force-dynamic';

/**
 * POST /api/positions - Save a new position to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const position: UserPosition = body.position;

    if (!position || !position.id || !position.txHash) {
      return NextResponse.json(
        { error: 'Invalid position data' },
        { status: 400 }
      );
    }

    // Extract wallet address from the position or request
    const walletAddress = body.walletAddress || extractWalletFromPosition(position);

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Convert UserPosition to database format
    const dbPosition = {
      id: position.id,
      wallet_address: walletAddress.toLowerCase(),
      timestamp: position.timestamp,
      tx_hash: position.txHash,
      status: position.status,

      // Order details
      strategy_type: position.order.strategyType,
      underlying: position.order.underlying,
      is_call: position.order.isCall,
      strikes: position.order.strikes,
      strike_width: position.order.strikeWidth,
      expiry: new Date(position.order.expiry).toISOString(),
      price_per_contract: position.order.pricePerContract,
      max_size: position.order.maxSize,

      // Position details
      collateral_used: position.collateralUsed,
      num_contracts: position.order.rawOrder.order.numContracts,

      // PnL tracking (will be updated later)
      entry_price: position.order.strikes[0] || null,
      current_price: null,
      pnl: 0,
      pnl_percentage: 0,
      is_settled: false,
      settlement_price: null,
      settlement_timestamp: null,

      // Store raw order for reference
      raw_order: position.order.rawOrder,
    };

    const { data, error } = await supabase
      .from('user_positions')
      .insert([dbPosition])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save position', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving position:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to save position', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/positions?wallet=0x... - Fetch positions for a wallet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_positions')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch positions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching positions:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch positions', message: errorMessage },
      { status: 500 }
    );
  }
}

function extractWalletFromPosition(position: UserPosition): string | null {
  // Try to extract from raw order maker field
  return position.order.rawOrder.order.maker || null;
}
