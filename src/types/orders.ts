export interface RawOrderData {
  order: {
    maker: string;
    orderExpiryTimestamp: number;
    collateral: string;
    isCall: boolean;
    priceFeed: string;
    implementation: string;
    isLong: boolean;
    maxCollateralUsable: string;
    strikes: string[];
    expiry: number;
    price: string;
    numContracts: string;
    extraOptionData: string;
    type?: 'binaries';
    name?: string;
    ticker?: string | null;
  };
  signature: string;
  chainId: number;
  optionBookAddress: string;
  nonce: string;
  greeks?: {
    delta: number;
    iv: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface ParsedOrder {
  strategyType: 'BINARY' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR';
  underlying: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB' | 'DOGE' | 'PAXG';
  isCall: boolean;
  strikes: number[];
  strikeWidth: number;
  expiry: Date;
  pricePerContract: number;
  maxSize: number;
  rawOrder: RawOrderData;
  isBinary: boolean;
  binaryName?: string;
}

export interface MarketData {
  BTC?: number;
  ETH?: number;
  SOL?: number;
  XRP?: number;
  BNB?: number;
  DOGE?: number;
  PAXG?: number;
  [key: string]: number | undefined;
}

export interface UserPosition {
  id: string;
  timestamp: number;
  order: ParsedOrder;
  collateralUsed: number;
  txHash: string;
  status: 'active' | string;
}

export interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: 'success' | 'error' | 'info';
}

// Odette API Position Types
export interface OdetteSettlement {
  settlementPrice: string; // 8 decimals
  payoutBuyer: string; // 6 decimals for USDC
  collateralReturnedSeller: string | null;
}

export interface OdettePosition {
  address: string; // Option contract address
  status: 'open' | 'settled' | 'closed';
  buyer: string;
  seller: string;
  referrer: string; // Referrer address - use this to filter
  createdBy: string; // OptionBook contract address

  // Entry details
  entryTimestamp: number;
  entryTxHash: string;
  entryPremium: string; // Premium paid (6 decimals for USDC)
  entryFeePaid: string; // Fee paid (6 decimals)

  // Option details
  collateralToken: string;
  collateralSymbol: string;
  collateralDecimals: number;
  underlyingAsset: string; // 'BTC', 'ETH', 'SOL', etc.
  priceFeed: string;
  strikes: string[]; // 8 decimals
  expiryTimestamp: number;
  numContracts: string; // 6 decimals (USDC)
  collateralAmount: string; // 6 decimals
  optionType: number;
  optionTypeRaw: number;

  // Settlement (only if settled)
  settlement?: OdetteSettlement | null;
  explicitClose?: any;
}

// Open positions API response
export interface OpenPositionsResponse {
  count: number;
  positions: OdettePosition[];
}

// Leaderboard entry type
export interface LeaderboardEntry {
  wallet_address: string;
  total_bets: number;
  settled_bets: number;
  winning_bets: number;
  losing_bets: number;
  win_rate: number;
  total_pnl: number;
  roi_percentage: number;
  total_volume: number;
}
