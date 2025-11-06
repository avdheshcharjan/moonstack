// Types for referral system

export interface Referral {
  id: string;
  referrer_wallet: string;
  referee_wallet: string;
  referee_code_used: string;
  is_active: boolean;
  first_trade_at: string | null;
  total_trades_count: number;
  total_points_generated: number;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  inactive_referrals: number;
  bonus_multiplier: number;
  bonus_tier: 'FLAT' | 'TIER_1' | 'TIER_2';
  total_bonus_points: number;
  referral_code: string;
  referral_link: string;
}

export interface ReferralCode {
  code: string;
  wallet_address: string;
  referral_link: string;
}

export interface ReferralValidation {
  valid: boolean;
  code: string;
  referrer_wallet?: string;
  error?: string;
}

export interface RefereeInfo {
  wallet_address: string; // Anonymized in public view
  is_active: boolean;
  first_trade_at: string | null;
  total_trades_count: number;
  points_generated: number;
  joined_at: string;
}

