// Types for seasons system

export interface Season {
  id: string;
  season_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface WeeklyLeaderboardEntry {
  id: string;
  wallet_address: string;
  season_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  weekly_profit_usd: number;
  weekly_points_earned: number;
  rank: number;
  created_at: string;
}

export interface SeasonLeaderboardEntry {
  wallet_address: string;
  current_season_points: number;
  active_referrals_count: number;
  total_trades: number;
  winning_trades: number;
  total_profit: number;
  rank: number;
}

export interface SeasonInfo {
  current_season: Season | null;
  weeks_remaining: number;
  current_week_number: number;
  days_until_end: number;
}

