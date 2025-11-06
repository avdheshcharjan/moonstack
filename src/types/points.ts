// Types for points system

export interface UserPoints {
  wallet_address: string;
  total_points: number;
  current_season_points: number;
  current_season_id: string | null;
  referral_code: string;
  referred_by: string | null;
  active_referrals_count: number;
  created_at: string;
  updated_at: string;
}

export type PointTransactionType = 'TRADE' | 'REFERRAL_BONUS' | 'ADMIN_ADJUSTMENT';

export interface PointTransaction {
  id: string;
  wallet_address: string;
  points_earned: number;
  transaction_type: PointTransactionType;
  source_tx_hash?: string;
  source_position_id?: string;
  metadata?: {
    profit_usd?: number;
    trade_details?: any;
    referrer_wallet?: string;
    referee_wallet?: string;
    bonus_tier?: string;
    [key: string]: any;
  };
  season_id: string | null;
  created_at: string;
}

export interface PointsBalance {
  wallet_address: string;
  total_points: number;
  current_season_points: number;
  rank: number;
  season_rank: number;
  breakdown: {
    trade_points: number;
    referral_bonus_points: number;
    adjustment_points: number;
  };
}

export interface PointsHistoryResponse {
  transactions: PointTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

