import type { Hex, Address } from 'viem';

export interface CartTransaction {
  id: string;
  to: Address;
  data: Hex;
  value?: bigint;
  description: string;
  timestamp: number;
  requiredUSDC?: bigint;
  orderDetails?: {
    marketId: string;
    side: 'YES' | 'NO';
    amount: string;
  };
}

export interface CartState {
  transactions: CartTransaction[];
  lastUpdated: number;
}
