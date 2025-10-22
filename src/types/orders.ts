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
  underlying: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB';
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
