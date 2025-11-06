import { NextRequest, NextResponse } from 'next/server';
import { OdettePosition } from '@/src/types/orders';
import { REFERRER_ADDRESS } from '@/src/utils/contracts';

export const dynamic = 'force-dynamic';

const ODETTE_API_BASE = 'https://odette.fi/api';

/**
 * POST /api/positions - Stub endpoint for backward compatibility
 * Note: We no longer store positions to a database. Positions are indexed by Odette API.
 * This endpoint returns success but doesn't store anything.
 * After a trade, positions will be available via GET /api/positions once Odette indexes them.
 */
export async function POST(request: NextRequest) {
  try {
    // No longer storing to database - positions are indexed by Odette API
    // Optionally, you could call https://odette.fi/api/update here to trigger indexing
    
    return NextResponse.json({ 
      success: true, 
      message: 'Position tracking handled by Odette API',
      note: 'Positions will be available via GET /api/positions once indexed by Odette'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/positions?wallet=0x... - Fetch positions for a wallet from Odette API
 * Fetches both open and settled positions, filtered by our REFERRER_ADDRESS
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

    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedReferrer = REFERRER_ADDRESS.toLowerCase();

    // Fetch both open positions and history in parallel
    const [openResponse, historyResponse] = await Promise.all([
      fetch(`${ODETTE_API_BASE}/user/${normalizedWallet}/positions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(`${ODETTE_API_BASE}/user/${normalizedWallet}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    let openPositions: OdettePosition[] = [];
    let settledPositions: OdettePosition[] = [];

    // Parse open positions (if available)
    if (openResponse.ok) {
      const openData = await openResponse.json();
      openPositions = Array.isArray(openData) ? openData : [];
    } else if (openResponse.status !== 404) {
      console.warn('Failed to fetch open positions:', openResponse.status);
    }

    // Parse history (settled positions)
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      settledPositions = Array.isArray(historyData) ? historyData : [];
    } else if (historyResponse.status !== 404) {
      console.warn('Failed to fetch history:', historyResponse.status);
    }

    // Combine and filter by our referrer address
    const allPositions = [...openPositions, ...settledPositions];
    const filteredPositions = allPositions.filter(
      (position) =>
        position.referrer &&
        position.referrer.toLowerCase() === normalizedReferrer
    );

    // Transform Odette positions to our internal format
    const transformedPositions = filteredPositions.map((position) =>
      transformOdettePosition(position)
    );

    return NextResponse.json({
      success: true,
      data: transformedPositions,
      count: transformedPositions.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching positions:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch positions', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Transform Odette position to internal format for display
 */
function transformOdettePosition(position: OdettePosition) {
  // Parse numeric values (all use correct decimals)
  const entryPremium = parseFloat(position.entryPremium) / 1e6; // USDC 6 decimals
  const entryFeePaid = parseFloat(position.entryFeePaid) / 1e6; // USDC 6 decimals
  const entryCost = entryPremium + entryFeePaid;

  // Parse strikes from 8 decimals
  const strikes = position.strikes.map((s) => parseFloat(s) / 1e8);
  
  // Calculate strike width
  let strikeWidth = 0;
  if (strikes.length === 2) {
    strikeWidth = Math.abs(strikes[1] - strikes[0]);
  } else if (strikes.length === 3) {
    strikeWidth = strikes[1] - strikes[0];
  } else if (strikes.length === 4) {
    strikeWidth = strikes[1] - strikes[0];
  }

  // Determine option type
  const isCall = determineIsCall(position.optionType);
  
  // Calculate PnL
  let pnl = 0;
  let pnlPercentage = 0;
  let settlementPrice = null;

  if (position.status === 'settled' && position.settlement) {
    const payoutBuyer = parseFloat(position.settlement.payoutBuyer) / 1e6; // USDC 6 decimals
    pnl = payoutBuyer - entryCost;
    pnlPercentage = entryCost > 0 ? (pnl / entryCost) * 100 : 0;
    settlementPrice = parseFloat(position.settlement.settlementPrice) / 1e8; // 8 decimals
  }

  // Parse contracts
  const numContracts = parseFloat(position.numContracts) / 1e6; // USDC 6 decimals
  const collateralAmount = parseFloat(position.collateralAmount) / 1e6; // USDC 6 decimals

  return {
    id: position.address,
    wallet_address: position.buyer.toLowerCase(),
    timestamp: position.entryTimestamp * 1000, // Convert to ms
    tx_hash: position.entryTxHash,
    status: position.status,

    // Order details
    strategy_type: determineStrategyType(strikes.length),
    underlying: position.underlyingAsset,
    is_call: isCall,
    strikes,
    strike_width: strikeWidth,
    expiry: new Date(position.expiryTimestamp * 1000).toISOString(),
    price_per_contract: entryPremium / numContracts,
    max_size: collateralAmount,
    collateral_used: entryCost,
    num_contracts: numContracts,

    // Bet details
    decision: isCall ? 'YES' : 'NO',
    question: null,
    threshold: strikes[0] || null,
    bet_size: entryCost,

    // PnL tracking
    entry_price: strikes[0] || null,
    current_price: null,
    pnl,
    pnl_percentage: pnlPercentage,
    is_settled: position.status === 'settled',
    settlement_price: settlementPrice,
    settlement_timestamp: position.status === 'settled' ? position.expiryTimestamp : null,

    // Keep original for reference
    raw_position: position,
  };
}

/**
 * Determine strategy type based on number of strikes
 */
function determineStrategyType(strikeCount: number): string {
  switch (strikeCount) {
    case 1:
      return 'BINARY';
    case 2:
      return 'SPREAD';
    case 3:
      return 'BUTTERFLY';
    case 4:
      return 'CONDOR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Determine if option is call based on option type code
 * This is a simplified version - you may need to adjust based on actual option type codes
 */
function determineIsCall(optionType: number): boolean {
  // Based on common option type encoding:
  // Even numbers are often calls, odd numbers are puts
  // Or specific ranges indicate call vs put
  // This is a placeholder - adjust based on actual option type codes from the API
  
  // For now, we'll need to look at the implementation addresses or other fields
  // This is a simplified heuristic
  return optionType % 2 === 0;
}
