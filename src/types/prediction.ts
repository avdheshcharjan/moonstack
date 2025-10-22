import { RawOrderData, ParsedOrder } from './orders';

export interface BinaryPair {
  id: string;
  underlying: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB';
  expiry: Date;
  threshold: number;
  question: string;
  callOption: RawOrderData;
  putOption: RawOrderData;
  callParsed: ParsedOrder;
  putParsed: ParsedOrder;
  impliedProbability: {
    up: number;
    down: number;
  };
  uniqueWallets?: number;
}

export type SwipeAction = 'yes' | 'no' | null;
