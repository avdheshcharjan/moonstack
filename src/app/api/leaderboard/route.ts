import { NextRequest, NextResponse } from 'next/server';
import { OdettePosition, LeaderboardEntry, OpenPositionsResponse } from '@/src/types/orders';
import { REFERRER_ADDRESS } from '@/src/utils/contracts';

export const dynamic = 'force-dynamic';

const ODETTE_API_BASE = 'https://odette.fi/api';

// Cache leaderboard results for 30 seconds to improve performance
let cachedLeaderboard: LeaderboardEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * GET /api/leaderboard - Fetch leaderboard data from Odette API
 * Query params:
 *   - limit: number of entries to return (default: 100)
 *   - orderBy: 'total_pnl' | 'win_rate' | 'roi_percentage' (default: 'total_pnl')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const orderBy = searchParams.get('orderBy') || 'total_pnl';

    // Validate orderBy parameter
    const validOrderBy = ['total_pnl', 'win_rate', 'roi_percentage', 'total_bets'];
    if (!validOrderBy.includes(orderBy)) {
      return NextResponse.json(
        { error: 'Invalid orderBy parameter' },
        { status: 400 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedLeaderboard && now - cacheTimestamp < CACHE_DURATION) {
      console.log('Returning cached leaderboard data');
      const sortedData = sortLeaderboard(cachedLeaderboard, orderBy);
      return NextResponse.json({ 
        success: true, 
        data: sortedData.slice(0, limit),
        cached: true 
      });
    }

    // Fetch and aggregate leaderboard data
    const leaderboardData = await fetchAndAggregateLeaderboard();

    // Cache the results
    cachedLeaderboard = leaderboardData;
    cacheTimestamp = now;

    // Sort by requested field
    const sortedData = sortLeaderboard(leaderboardData, orderBy);

    return NextResponse.json({ 
      success: true, 
      data: sortedData.slice(0, limit),
      cached: false 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching leaderboard:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Fetch all open positions and aggregate by wallet
 */
async function fetchAndAggregateLeaderboard(): Promise<LeaderboardEntry[]> {
  const normalizedReferrer = REFERRER_ADDRESS.toLowerCase();
  const additionalReferrer = '0x0000000000000000000000000000000000000001'.toLowerCase();

  // Step 1: Fetch all open positions
  console.log('Fetching all open positions...');
  const openPositionsResponse = await fetch(`${ODETTE_API_BASE}/open-positions`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!openPositionsResponse.ok) {
    throw new Error('Failed to fetch open positions');
  }

  const openPositionsData: OpenPositionsResponse = await openPositionsResponse.json();
  const allOpenPositions = openPositionsData.positions || [];

  // Step 2: Filter by our referrer addresses
  const ourOpenPositions = allOpenPositions.filter(
    (position) =>
      position.referrer &&
      (position.referrer.toLowerCase() === normalizedReferrer ||
        position.referrer.toLowerCase() === additionalReferrer)
  );

  console.log(`Found ${ourOpenPositions.length} open positions from our platform`);

  // Step 3: Extract unique wallet addresses
  const uniqueWallets = new Set<string>();
  ourOpenPositions.forEach((position) => {
    uniqueWallets.add(position.buyer.toLowerCase());
  });

  console.log(`Found ${uniqueWallets.size} unique wallets with open positions`);

  // Step 4: Fetch history for each wallet and aggregate stats
  const walletStatsPromises = Array.from(uniqueWallets).map(async (wallet) => {
    return await aggregateWalletStats(wallet, [normalizedReferrer, additionalReferrer]);
  });

  const walletStats = await Promise.all(walletStatsPromises);

  // Filter out wallets with no bets (shouldn't happen, but just in case)
  return walletStats.filter((stats) => stats.total_bets > 0);
}

/**
 * Aggregate stats for a single wallet
 */
async function aggregateWalletStats(
  walletAddress: string,
  normalizedReferrers: string[]
): Promise<LeaderboardEntry> {
  try {
    // Fetch both open positions and history for this wallet
    const [openResponse, historyResponse] = await Promise.all([
      fetch(`${ODETTE_API_BASE}/user/${walletAddress}/positions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(`${ODETTE_API_BASE}/user/${walletAddress}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    let openPositions: OdettePosition[] = [];
    let settledPositions: OdettePosition[] = [];

    // Parse open positions
    if (openResponse.ok) {
      const openData = await openResponse.json();
      openPositions = Array.isArray(openData) ? openData : [];
    }

    // Parse history
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      settledPositions = Array.isArray(historyData) ? historyData : [];
    }

    // Filter by our referrer addresses
    const ourOpenPositions = openPositions.filter(
      (p) => p.referrer && normalizedReferrers.includes(p.referrer.toLowerCase())
    );
    const ourSettledPositions = settledPositions.filter(
      (p) => p.referrer && normalizedReferrers.includes(p.referrer.toLowerCase())
    );

    // Calculate stats
    const totalBets = ourOpenPositions.length + ourSettledPositions.length;
    const settledBets = ourSettledPositions.length;

    let totalPnl = 0;
    let totalVolume = 0;
    let winningBets = 0;
    let losingBets = 0;

    // Calculate PnL from settled positions
    ourSettledPositions.forEach((position) => {
      const entryPremium = parseFloat(position.entryPremium || '0') / 1e6;
      const entryFeePaid = parseFloat(position.entryFeePaid || '0') / 1e6;
      const entryCost = entryPremium + entryFeePaid;

      if (!isNaN(entryCost)) {
        totalVolume += entryCost;
      }

      if (position.settlement && position.settlement.payoutBuyer !== null && position.settlement.payoutBuyer !== undefined) {
        const payoutBuyer = parseFloat(position.settlement.payoutBuyer) / 1e6;

        if (!isNaN(payoutBuyer) && !isNaN(entryCost)) {
          const pnl = payoutBuyer - entryCost;
          totalPnl += pnl;

          if (pnl > 0) {
            winningBets++;
          } else if (pnl < 0) {
            losingBets++;
          }
        }
      }
    });

    // Add volume from open positions (not counted in PnL yet)
    ourOpenPositions.forEach((position) => {
      const entryPremium = parseFloat(position.entryPremium || '0') / 1e6;
      const entryFeePaid = parseFloat(position.entryFeePaid || '0') / 1e6;
      const entryCost = entryPremium + entryFeePaid;

      if (!isNaN(entryCost)) {
        totalVolume += entryCost;
      }
    });

    // Calculate win rate
    const winRate = settledBets > 0 ? (winningBets / settledBets) * 100 : 0;

    // Calculate ROI
    const roiPercentage = totalVolume > 0 ? (totalPnl / totalVolume) * 100 : 0;

    return {
      wallet_address: walletAddress,
      total_bets: totalBets,
      settled_bets: settledBets,
      winning_bets: winningBets,
      losing_bets: losingBets,
      win_rate: winRate,
      total_pnl: totalPnl,
      roi_percentage: roiPercentage,
      total_volume: totalVolume,
    };
  } catch (error) {
    console.error(`Error aggregating stats for wallet ${walletAddress}:`, error);
    // Return empty stats if there's an error
    return {
      wallet_address: walletAddress,
      total_bets: 0,
      settled_bets: 0,
      winning_bets: 0,
      losing_bets: 0,
      win_rate: 0,
      total_pnl: 0,
      roi_percentage: 0,
      total_volume: 0,
    };
  }
}

/**
 * Sort leaderboard by specified field
 */
function sortLeaderboard(
  data: LeaderboardEntry[],
  orderBy: string
): LeaderboardEntry[] {
  const sorted = [...data];

  switch (orderBy) {
    case 'total_pnl':
      sorted.sort((a, b) => b.total_pnl - a.total_pnl);
      break;
    case 'win_rate':
      sorted.sort((a, b) => b.win_rate - a.win_rate);
      break;
    case 'roi_percentage':
      sorted.sort((a, b) => b.roi_percentage - a.roi_percentage);
      break;
    case 'total_bets':
      sorted.sort((a, b) => b.total_bets - a.total_bets);
      break;
    default:
      sorted.sort((a, b) => b.total_pnl - a.total_pnl);
  }

  return sorted;
}
