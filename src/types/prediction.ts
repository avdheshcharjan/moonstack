import { RawOrderData, ParsedOrder } from './orders';

export type ExpiryFilter = 'all' | '1D' | '2D' | '3D' | 'weekly' | 'monthly' | 'quarterly';

export interface BinaryPair {
  id: string;
  underlying: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB' | 'DOGE' | 'PAXG';
  expiry: Date;
  threshold: number;
  question: string;
  callOption: RawOrderData;
  putOption: RawOrderData;
  callParsed: ParsedOrder;
  putParsed: ParsedOrder;
  isHourly: boolean;
  impliedProbability: {
    up: number;
    down: number;
  };
  uniqueWallets?: number;
}

export type SwipeAction = 'yes' | 'no' | null;
