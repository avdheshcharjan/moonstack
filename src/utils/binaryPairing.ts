import { RawOrderData, ParsedOrder } from '../types/orders';
import { BinaryPair } from '../types/prediction';
import { parseOrder } from './optionsParser';
import { BTC_FEED, ETH_FEED, SOL_FEED, BNB_FEED, XRP_FEED } from './contracts';

/**
 * Extracts the decision boundary strike from a binary option.
 * For CALL options (betting UP): the decision boundary is the upper strike (max of the range)
 * For PUT options (betting DOWN): the decision boundary is the lower strike (min of the range)
 *
 * Example:
 * - CALL [98k, 100k]: decision boundary is 100k (betting price will be ABOVE 100k)
 * - PUT [100k, 102k]: decision boundary is 100k (betting price will be BELOW 100k)
 *
 * @param strikes Array of strike prices (already converted from 1e8 scaling)
 * @param isCall Whether this is a CALL option
 * @returns Decision boundary price
 */
function getDecisionBoundary(strikes: number[], isCall: boolean): number {
  if (strikes.length !== 2) {
    throw new Error('Binary options must have exactly 2 strikes');
  }
  // For CALL: upper bound (max), for PUT: lower bound (min)
  return isCall ? Math.max(strikes[0], strikes[1]) : Math.min(strikes[0], strikes[1]);
}

/**
 * Formats a Unix timestamp into a readable date string.
 *
 * @param unixTimestamp Unix timestamp in seconds
 * @returns Formatted date string (e.g., "Oct 31, 2025")
 */
function formatExpiryDate(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Determines the underlying asset from the price feed address.
 *
 * @param priceFeed Oracle price feed address
 * @returns 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB'
 */
function getUnderlyingAsset(priceFeed: string): 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB' {
  const priceFeedLower = priceFeed.toLowerCase();

  if (priceFeedLower === BTC_FEED.toLowerCase()) {
    return 'BTC';
  }
  if (priceFeedLower === ETH_FEED.toLowerCase()) {
    return 'ETH';
  }
  if (priceFeedLower === SOL_FEED.toLowerCase()) {
    return 'SOL';
  }
  if (priceFeedLower === BNB_FEED.toLowerCase()) {
    return 'BNB';
  }
  if (priceFeedLower === XRP_FEED.toLowerCase()) {
    return 'XRP';
  }
  throw new Error(`Unknown price feed: ${priceFeed}`);
}

/**
 * Calculates implied probability for a binary option.
 * Formula: (premium / maxPayout) * 100
 *
 * @param premium Price per contract (already converted from 1e8 scaling)
 * @param maxPayout Maximum payout (strike width)
 * @returns Implied probability as a percentage (0-100)
 */
function calculateImpliedProbability(premium: number, maxPayout: number): number {
  if (maxPayout <= 0) {
    throw new Error('Max payout must be greater than 0');
  }
  return (premium / maxPayout) * 100;
}

/**
 * Generates a prediction question for a binary pair.
 *
 * @param asset Underlying asset ('BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB')
 * @param decisionBoundary Decision boundary price
 * @param expiry Unix timestamp of expiry
 * @returns Prediction question string
 */
function generatePredictionQuestion(asset: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB', decisionBoundary: number, expiry: number): string {
  const formattedDate = formatExpiryDate(expiry);
  const formattedPrice = decisionBoundary.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `Will ${asset} be above ${formattedPrice} by ${formattedDate}?`;
}

/**
 * Pairs complementary binary options (CALL and PUT) into prediction market cards.
 *
 * Pairing criteria:
 * - Same underlying asset (BTC, ETH, SOL, XRP, or BNB via priceFeed)
 * - Same expiry timestamp
 * - Same decision boundary (the shared strike price between CALL and PUT)
 * - One CALL (isCall=true) and one PUT (isCall=false)
 *
 * Note: Strike ranges differ between CALL and PUT:
 * - CALL [98k, 100k]: betting price will be ABOVE 100k
 * - PUT [100k, 102k]: betting price will be BELOW 100k
 * They share the decision boundary of 100k.
 *
 * Unpaired binaries are skipped.
 *
 * @param orders Array of raw order data from the API
 * @returns Array of binary pairs ready for display as prediction cards
 */
export function pairBinaryOptions(orders: RawOrderData[]): BinaryPair[] {
  // Filter to only binary options
  const binaries = orders.filter(order => order.order.type === 'binaries');

  // Parse all binary orders
  const parsedBinaries = binaries.map(order => ({
    raw: order,
    parsed: parseOrder(order)
  }));

  // Group binaries by pairing key: underlying_expiry_decisionBoundary
  interface PairingGroup {
    underlying: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB';
    expiry: number;
    decisionBoundary: number;
    calls: Array<{ raw: RawOrderData; parsed: ParsedOrder }>;
    puts: Array<{ raw: RawOrderData; parsed: ParsedOrder }>;
  }

  const groups = new Map<string, PairingGroup>();

  for (const { raw, parsed } of parsedBinaries) {
    const underlying = getUnderlyingAsset(raw.order.priceFeed);
    const expiry = raw.order.expiry;
    const decisionBoundary = getDecisionBoundary(parsed.strikes, raw.order.isCall);

    // Create pairing key (round to avoid floating point issues)
    const roundedBoundary = Math.round(decisionBoundary);
    const key = `${underlying}_${expiry}_${roundedBoundary}`;

    // Get or create group
    let group = groups.get(key);
    if (!group) {
      group = {
        underlying,
        expiry,
        decisionBoundary: roundedBoundary,
        calls: [],
        puts: []
      };
      groups.set(key, group);
    }

    // Add to appropriate list
    if (raw.order.isCall) {
      group.calls.push({ raw, parsed });
    } else {
      group.puts.push({ raw, parsed });
    }
  }

  // Create pairs from groups that have both CALL and PUT
  const pairs: BinaryPair[] = [];

  for (const group of groups.values()) {
    // Need at least one CALL and one PUT to form a pair
    if (group.calls.length === 0 || group.puts.length === 0) {
      continue;
    }

    // Use the first CALL and PUT in each group
    // (In practice, there should only be one of each per group)
    const callOption = group.calls[0];
    const putOption = group.puts[0];

    // Calculate implied probabilities
    const callProbability = calculateImpliedProbability(
      callOption.parsed.pricePerContract,
      callOption.parsed.strikeWidth
    );

    const putProbability = calculateImpliedProbability(
      putOption.parsed.pricePerContract,
      putOption.parsed.strikeWidth
    );

    // Calculate unique wallets (makers from both calls and puts)
    const walletSet = new Set<string>();
    group.calls.forEach(c => walletSet.add(c.raw.order.maker.toLowerCase()));
    group.puts.forEach(p => walletSet.add(p.raw.order.maker.toLowerCase()));
    const uniqueWallets = walletSet.size;

    // Generate prediction question
    const question = generatePredictionQuestion(
      group.underlying,
      group.decisionBoundary,
      group.expiry
    );

    // Create the binary pair with a stable ID
    const pair: BinaryPair = {
      id: `${group.underlying}_${group.decisionBoundary}_${group.expiry}`,
      underlying: group.underlying,
      expiry: new Date(group.expiry * 1000),
      threshold: group.decisionBoundary,
      question,
      callOption: callOption.raw,
      putOption: putOption.raw,
      callParsed: callOption.parsed,
      putParsed: putOption.parsed,
      impliedProbability: {
        up: callProbability,
        down: putProbability
      },
      uniqueWallets
    };

    pairs.push(pair);
  }

  return pairs;
}
