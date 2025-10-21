import { RawOrderData, ParsedOrder } from './orders';

export interface BinaryPair {
  id: string;
  underlying: 'BTC' | 'ETH';
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
}

export type SwipeAction = 'yes' | 'no' | null;

export interface PredictionCard {
  pair: BinaryPair;
  question: string;
  impliedProbability: number;
  currentPrice: number;
  threshold: number;
  timeRemaining: string;
  betSize: number;
  potentialPayout: number;
  strikeRange: {
    lower: number;
    upper: number;
  };
}
