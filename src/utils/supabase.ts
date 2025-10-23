import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface DbUserPosition {
  id: string;
  wallet_address: string;
  timestamp: number;
  tx_hash: string;
  status: string;
  strategy_type: string;
  underlying: string;
  is_call: boolean;
  strikes: number[];
  strike_width: number;
  expiry: string;
  price_per_contract: number;
  max_size: number;
  collateral_used: number;
  num_contracts: string;
  entry_price: number | null;
  current_price: number | null;
  pnl: number;
  pnl_percentage: number;
  is_settled: boolean;
  settlement_price: number | null;
  settlement_timestamp: string | null;
  raw_order: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  wallet_address: string;
  total_bets: number;
  settled_bets: number;
  winning_bets: number;
  losing_bets: number;
  total_pnl: number;
  roi_percentage: number;
  win_rate: number;
  last_activity: string;
}
