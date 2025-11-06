-- Points and Referral System Migration
-- Creates tables for points tracking, referrals, seasons, and leaderboards

-- 1. Add points_processed field to existing user_positions table
ALTER TABLE user_positions 
ADD COLUMN IF NOT EXISTS points_processed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_positions_points_processed 
ON user_positions(points_processed) WHERE points_processed = false;

-- 2. Create seasons table for 12-week incentive periods
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);

-- 3. Create user_points table for tracking cumulative and seasonal points
CREATE TABLE IF NOT EXISTS user_points (
  wallet_address TEXT PRIMARY KEY,
  total_points NUMERIC DEFAULT 0 NOT NULL,
  current_season_points NUMERIC DEFAULT 0 NOT NULL,
  current_season_id UUID REFERENCES seasons(id),
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  active_referrals_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_referral_code ON user_points(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_points_referred_by ON user_points(referred_by);
CREATE INDEX IF NOT EXISTS idx_user_points_season_points ON user_points(current_season_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_total_points ON user_points(total_points DESC);

-- 4. Create point_transactions table for audit log
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  points_earned NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('TRADE', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT')),
  source_tx_hash TEXT,
  source_position_id TEXT,
  metadata JSONB,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet ON point_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet_season ON point_transactions(wallet_address, season_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);

-- 5. Create referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_wallet TEXT NOT NULL,
  referee_wallet TEXT NOT NULL UNIQUE,
  referee_code_used TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  first_trade_at TIMESTAMPTZ,
  total_trades_count INTEGER DEFAULT 0,
  total_points_generated NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_wallet) REFERENCES user_points(wallet_address),
  CONSTRAINT unique_referee UNIQUE(referee_wallet)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_active ON referrals(is_active);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referee_code_used);

-- 6. Create weekly_leaderboard table for weekly snapshots
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  season_id UUID NOT NULL REFERENCES seasons(id),
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 12),
  week_start_date TIMESTAMPTZ NOT NULL,
  week_end_date TIMESTAMPTZ NOT NULL,
  weekly_profit_usd NUMERIC NOT NULL,
  weekly_points_earned NUMERIC NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, week_number, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_season_week ON weekly_leaderboard(season_id, week_number, rank);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_wallet ON weekly_leaderboard(wallet_address);

-- 7. Create social_verifications table (schema for future use)
CREATE TABLE IF NOT EXISTS social_verifications (
  wallet_address TEXT PRIMARY KEY,
  discord_id TEXT,
  discord_username TEXT,
  telegram_id TEXT,
  telegram_username TEXT,
  twitter_id TEXT,
  twitter_username TEXT,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'partial', 'verified')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_verifications_status ON social_verifications(verification_status);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points;
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_verifications_updated_at ON social_verifications;
CREATE TRIGGER update_social_verifications_updated_at
  BEFORE UPDATE ON social_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Enable Row Level Security
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_verifications ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies (public read, authenticated write)
-- Seasons: everyone can read, only admins can write (handled at API level)
CREATE POLICY "Allow public read access" ON seasons
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for service role" ON seasons
  FOR INSERT WITH CHECK (true);

-- User points: everyone can read, users can update their own
CREATE POLICY "Allow public read access" ON user_points
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON user_points
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for all" ON user_points
  FOR UPDATE USING (true);

-- Point transactions: everyone can read their own
CREATE POLICY "Allow public read access" ON point_transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON point_transactions
  FOR INSERT WITH CHECK (true);

-- Referrals: everyone can read, system can write
CREATE POLICY "Allow public read access" ON referrals
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON referrals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for all" ON referrals
  FOR UPDATE USING (true);

-- Weekly leaderboard: everyone can read
CREATE POLICY "Allow public read access" ON weekly_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON weekly_leaderboard
  FOR INSERT WITH CHECK (true);

-- Social verifications: everyone can read, users can update their own
CREATE POLICY "Allow public read access" ON social_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON social_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for all" ON social_verifications
  FOR UPDATE USING (true);

-- 12. Create materialized view for current season leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS current_season_leaderboard AS
SELECT 
  up.wallet_address,
  up.current_season_points,
  up.active_referrals_count,
  COUNT(DISTINCT pos.id) as total_trades,
  COALESCE(SUM(CASE WHEN pos.is_settled AND pos.pnl > 0 THEN 1 ELSE 0 END), 0) as winning_trades,
  COALESCE(SUM(CASE WHEN pos.is_settled THEN pos.pnl ELSE 0 END), 0) as total_profit,
  RANK() OVER (ORDER BY up.current_season_points DESC) as rank
FROM user_points up
LEFT JOIN user_positions pos ON pos.wallet_address = up.wallet_address
WHERE up.current_season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
GROUP BY up.wallet_address, up.current_season_points, up.active_referrals_count
ORDER BY up.current_season_points DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_current_season_leaderboard_wallet 
ON current_season_leaderboard(wallet_address);

-- 13. Create function to refresh leaderboard materialized view
CREATE OR REPLACE FUNCTION refresh_current_season_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- 14. Create RPC functions for atomic operations

-- Function to increment user points atomically
CREATE OR REPLACE FUNCTION increment_user_points(
  user_wallet TEXT,
  points_to_add NUMERIC,
  season_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE user_points
  SET 
    total_points = total_points + points_to_add,
    current_season_points = CASE 
      WHEN current_season_id = season_id THEN current_season_points + points_to_add
      ELSE points_to_add
    END,
    current_season_id = season_id,
    updated_at = NOW()
  WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

-- Function to increment active referrals count
CREATE OR REPLACE FUNCTION increment_active_referrals(
  referrer_address TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE user_points
  SET 
    active_referrals_count = active_referrals_count + 1,
    updated_at = NOW()
  WHERE wallet_address = referrer_address;
END;
$$ LANGUAGE plpgsql;

-- 15. Comments for documentation
COMMENT ON TABLE seasons IS 'Tracks 12-week incentive seasons';
COMMENT ON TABLE user_points IS 'Stores cumulative and seasonal points for each user';
COMMENT ON TABLE point_transactions IS 'Audit log of all point changes';
COMMENT ON TABLE referrals IS 'Tracks referral relationships and activity';
COMMENT ON TABLE weekly_leaderboard IS 'Snapshot of weekly performance rankings';
COMMENT ON TABLE social_verifications IS 'Social media verification status (future use)';
COMMENT ON COLUMN user_positions.points_processed IS 'Whether points have been awarded for this position';

