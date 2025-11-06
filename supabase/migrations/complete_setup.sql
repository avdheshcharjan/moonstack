-- ============================================================================
-- COMPLETE MOONSTACK DATABASE SETUP (FIXED VERSION)
-- ============================================================================
-- This script sets up BOTH the classic leaderboard and the new points/referral system
-- Safe to run multiple times - checks if objects exist before creating
-- FIXED: Creates leaderboard view even if user_positions doesn't exist yet
-- ============================================================================

-- ============================================================================
-- PART 1: CLASSIC LEADERBOARD SYSTEM (Volume-Based)
-- ============================================================================

-- Drop existing view first
DROP VIEW IF EXISTS public.leaderboard CASCADE;

-- Create leaderboard view - works even if user_positions doesn't exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_positions'
  ) THEN
    -- Create real view with user_positions data
    CREATE VIEW public.leaderboard AS
    SELECT
      wallet_address,
      COUNT(*) as total_bets,
      SUM(CASE WHEN is_settled THEN 1 ELSE 0 END) as settled_bets,
      SUM(CASE WHEN is_settled AND pnl > 0 THEN 1 ELSE 0 END) as winning_bets,
      SUM(CASE WHEN is_settled AND pnl < 0 THEN 1 ELSE 0 END) as losing_bets,
      COALESCE(SUM(CASE WHEN is_settled THEN pnl ELSE 0 END), 0) as total_pnl,
      COALESCE(
        SUM(CASE WHEN is_settled THEN pnl ELSE 0 END) /
        NULLIF(SUM(CASE WHEN is_settled THEN collateral_used ELSE 0 END), 0) * 100,
        0
      ) as roi_percentage,
      COALESCE(
        SUM(CASE WHEN is_settled AND pnl > 0 THEN 1 ELSE 0 END)::NUMERIC /
        NULLIF(SUM(CASE WHEN is_settled THEN 1 ELSE 0 END), 0) * 100,
        0
      ) as win_rate,
      MAX(updated_at) as last_activity
    FROM user_positions
    GROUP BY wallet_address
    ORDER BY total_pnl DESC;
    
    RAISE NOTICE 'Created leaderboard view with user_positions data';
  ELSE
    -- Create dummy view that returns empty result set
    CREATE VIEW public.leaderboard AS
    SELECT
      NULL::TEXT as wallet_address,
      0::BIGINT as total_bets,
      0::BIGINT as settled_bets,
      0::BIGINT as winning_bets,
      0::BIGINT as losing_bets,
      0::NUMERIC as total_pnl,
      0::NUMERIC as roi_percentage,
      0::NUMERIC as win_rate,
      NULL::TIMESTAMPTZ as last_activity
    WHERE FALSE; -- Always returns 0 rows
    
    RAISE NOTICE 'Created empty leaderboard view (user_positions does not exist yet)';
  END IF;
END $$;

-- Grant permissions to PostgREST roles (CRITICAL!)
GRANT SELECT ON public.leaderboard TO anon;
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO service_role;

-- ============================================================================
-- PART 2: POINTS & REFERRAL SYSTEM
-- ============================================================================

-- 1. Create seasons table for 12-week incentive periods
-- ============================================================================
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seasons_season_number_key'
  ) THEN
    ALTER TABLE seasons ADD CONSTRAINT seasons_season_number_key UNIQUE (season_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_seasons_active 
ON seasons(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_seasons_dates 
ON seasons(start_date, end_date);

-- 2. Add points_processed column to user_positions if it exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_positions'
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_positions' 
      AND column_name = 'points_processed'
    ) THEN
      ALTER TABLE user_positions ADD COLUMN points_processed BOOLEAN DEFAULT false;
      RAISE NOTICE 'Added points_processed column to user_positions';
    END IF;
    
    -- Create index if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM pg_indexes 
      WHERE tablename = 'user_positions' 
      AND indexname = 'idx_user_positions_points_processed'
    ) THEN
      CREATE INDEX idx_user_positions_points_processed 
      ON user_positions(points_processed) WHERE points_processed = false;
    END IF;
  END IF;
END $$;

-- 3. Create user_points table for tracking cumulative and seasonal points
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_points (
  wallet_address TEXT PRIMARY KEY,
  total_points NUMERIC DEFAULT 0 NOT NULL,
  current_season_points NUMERIC DEFAULT 0 NOT NULL,
  current_season_id UUID REFERENCES seasons(id),
  referral_code TEXT NOT NULL,
  referred_by TEXT,
  active_referrals_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on referral_code if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_points_referral_code_key'
  ) THEN
    ALTER TABLE user_points ADD CONSTRAINT user_points_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_points_referral_code 
ON user_points(referral_code);

CREATE INDEX IF NOT EXISTS idx_user_points_referred_by 
ON user_points(referred_by);

CREATE INDEX IF NOT EXISTS idx_user_points_season_points 
ON user_points(current_season_points DESC);

CREATE INDEX IF NOT EXISTS idx_user_points_total_points 
ON user_points(total_points DESC);

-- 4. Create point_transactions table for audit log
-- ============================================================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  points_earned NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  source_tx_hash TEXT,
  source_position_id TEXT,
  metadata JSONB,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'point_transactions_transaction_type_check'
  ) THEN
    ALTER TABLE point_transactions 
    ADD CONSTRAINT point_transactions_transaction_type_check 
    CHECK (transaction_type IN ('TRADE', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet 
ON point_transactions(wallet_address);

CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet_season 
ON point_transactions(wallet_address, season_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_type 
ON point_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_point_transactions_created 
ON point_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transactions_source_position 
ON point_transactions(source_position_id) 
WHERE source_position_id IS NOT NULL;

-- 5. Create referrals table to track referral relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_wallet TEXT NOT NULL,
  referee_wallet TEXT NOT NULL,
  referee_code_used TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  first_trade_at TIMESTAMPTZ,
  total_trades_count INTEGER DEFAULT 0,
  total_points_generated NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on referee_wallet if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referee_wallet_key'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT referrals_referee_wallet_key UNIQUE (referee_wallet);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer 
ON referrals(referrer_wallet);

CREATE INDEX IF NOT EXISTS idx_referrals_referee 
ON referrals(referee_wallet);

CREATE INDEX IF NOT EXISTS idx_referrals_active 
ON referrals(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referrals_code 
ON referrals(referee_code_used);

-- Add foreign key constraint if both tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_points'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_referrer'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT fk_referrer 
    FOREIGN KEY (referrer_wallet) REFERENCES user_points(wallet_address);
    RAISE NOTICE 'Added foreign key constraint fk_referrer';
  END IF;
END $$;

-- 6. Create weekly_leaderboard table for snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id),
  week_number INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  week_start_date TIMESTAMPTZ NOT NULL,
  week_end_date TIMESTAMPTZ NOT NULL,
  weekly_profit_usd NUMERIC NOT NULL,
  weekly_points_earned NUMERIC NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'weekly_leaderboard_week_number_check'
  ) THEN
    ALTER TABLE weekly_leaderboard 
    ADD CONSTRAINT weekly_leaderboard_week_number_check 
    CHECK (week_number >= 1 AND week_number <= 12);
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'weekly_leaderboard_season_id_week_number_wallet_address_key'
  ) THEN
    ALTER TABLE weekly_leaderboard 
    ADD CONSTRAINT weekly_leaderboard_season_id_week_number_wallet_address_key 
    UNIQUE (season_id, week_number, wallet_address);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_season_week 
ON weekly_leaderboard(season_id, week_number, rank);

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_wallet 
ON weekly_leaderboard(wallet_address);

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_profit 
ON weekly_leaderboard(weekly_profit_usd DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_points 
ON weekly_leaderboard(weekly_points_earned DESC);

-- 7. Create social_verifications table (schema for future use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_verifications (
  wallet_address TEXT PRIMARY KEY,
  discord_id TEXT,
  telegram_id TEXT,
  twitter_id TEXT,
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'social_verifications_verification_status_check'
  ) THEN
    ALTER TABLE social_verifications 
    ADD CONSTRAINT social_verifications_verification_status_check 
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_verifications_status 
ON social_verifications(verification_status);

-- 8. Create function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
-- ============================================================================
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
-- ============================================================================
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_verifications ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies (public read, system can write)
-- ============================================================================

-- Seasons
DROP POLICY IF EXISTS "Allow public read access" ON seasons;
CREATE POLICY "Allow public read access" ON seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for service role" ON seasons;
CREATE POLICY "Allow insert for service role" ON seasons FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for service role" ON seasons;
CREATE POLICY "Allow update for service role" ON seasons FOR UPDATE USING (true);

-- User Points
DROP POLICY IF EXISTS "Allow public read access" ON user_points;
CREATE POLICY "Allow public read access" ON user_points FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON user_points;
CREATE POLICY "Allow insert for all" ON user_points FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON user_points;
CREATE POLICY "Allow update for all" ON user_points FOR UPDATE USING (true);

-- Point Transactions
DROP POLICY IF EXISTS "Allow public read access" ON point_transactions;
CREATE POLICY "Allow public read access" ON point_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON point_transactions;
CREATE POLICY "Allow insert for all" ON point_transactions FOR INSERT WITH CHECK (true);

-- Referrals
DROP POLICY IF EXISTS "Allow public read access" ON referrals;
CREATE POLICY "Allow public read access" ON referrals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON referrals;
CREATE POLICY "Allow insert for all" ON referrals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON referrals;
CREATE POLICY "Allow update for all" ON referrals FOR UPDATE USING (true);

-- Weekly Leaderboard
DROP POLICY IF EXISTS "Allow public read access" ON weekly_leaderboard;
CREATE POLICY "Allow public read access" ON weekly_leaderboard FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON weekly_leaderboard;
CREATE POLICY "Allow insert for all" ON weekly_leaderboard FOR INSERT WITH CHECK (true);

-- Social Verifications
DROP POLICY IF EXISTS "Allow public read access" ON social_verifications;
CREATE POLICY "Allow public read access" ON social_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON social_verifications;
CREATE POLICY "Allow insert for all" ON social_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all" ON social_verifications;
CREATE POLICY "Allow update for all" ON social_verifications FOR UPDATE USING (true);

-- 12. Create materialized view for current season leaderboard
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS current_season_leaderboard CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_positions'
  ) THEN
    CREATE MATERIALIZED VIEW current_season_leaderboard AS
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
    
    RAISE NOTICE 'Created current_season_leaderboard materialized view with user_positions';
  ELSE
    CREATE MATERIALIZED VIEW current_season_leaderboard AS
    SELECT 
      up.wallet_address,
      up.current_season_points,
      up.active_referrals_count,
      0 as total_trades,
      0 as winning_trades,
      0 as total_profit,
      RANK() OVER (ORDER BY up.current_season_points DESC) as rank
    FROM user_points up
    WHERE up.current_season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
    GROUP BY up.wallet_address, up.current_season_points, up.active_referrals_count
    ORDER BY up.current_season_points DESC;
    
    RAISE NOTICE 'Created current_season_leaderboard materialized view without user_positions';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create materialized view: %', SQLERRM;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_current_season_leaderboard_wallet 
ON current_season_leaderboard(wallet_address);

-- Grant permissions on materialized view
GRANT SELECT ON current_season_leaderboard TO anon;
GRANT SELECT ON current_season_leaderboard TO authenticated;
GRANT SELECT ON current_season_leaderboard TO service_role;

-- 13. Create function to refresh leaderboard materialized view
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_current_season_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- 14. Create helper functions for atomic point operations
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_user_points(
  user_wallet TEXT,
  points_to_add NUMERIC,
  season_uuid UUID
)
RETURNS void AS $$
BEGIN
  UPDATE user_points
  SET 
    total_points = total_points + points_to_add,
    current_season_points = current_season_points + points_to_add,
    current_season_id = season_uuid,
    updated_at = NOW()
  WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

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

-- 15. Add table and column comments for documentation
-- ============================================================================
COMMENT ON TABLE seasons IS 'Tracks 12-week incentive seasons';
COMMENT ON TABLE user_points IS 'Stores cumulative and seasonal points for each user';
COMMENT ON TABLE point_transactions IS 'Audit log of all point changes';
COMMENT ON TABLE referrals IS 'Tracks referral relationships and activity';
COMMENT ON TABLE weekly_leaderboard IS 'Snapshot of weekly performance rankings sorted by profit';
COMMENT ON TABLE social_verifications IS 'Social media verification status (future use)';

COMMENT ON COLUMN user_points.referral_code IS 'Unique 6-character alphanumeric referral code';
COMMENT ON COLUMN user_points.active_referrals_count IS 'Count of referrals who have completed at least one trade';
COMMENT ON COLUMN referrals.is_active IS 'True when referee has completed their first trade';
COMMENT ON COLUMN referrals.total_points_generated IS 'Cumulative points from referee that generated bonuses for referrer';
COMMENT ON COLUMN weekly_leaderboard.weekly_profit_usd IS 'Total profit (PnL) for the week - used for ranking';
COMMENT ON COLUMN weekly_leaderboard.weekly_points_earned IS 'Total points earned during the week';
COMMENT ON COLUMN point_transactions.transaction_type IS 'TRADE, REFERRAL_BONUS, or ADMIN_ADJUSTMENT';

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_positions'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN user_positions.points_processed IS ''Whether points have been awarded for this settled position''';
  END IF;
END $$;

-- 16. Refresh PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Summary of what was created:
-- 1. Classic leaderboard view (created even without user_positions)
-- 2. Points system tables (seasons, user_points, point_transactions, referrals, weekly_leaderboard)
-- 3. Materialized view for current season rankings
-- 4. Indexes for optimal query performance
-- 5. RLS policies for security
-- 6. Helper functions for atomic operations
-- 7. Proper permissions granted to PostgREST roles
-- 
-- Next steps:
-- 1. Verify: Visit /api/admin/verify-schema
-- 2. Test leaderboard: Visit /api/leaderboard
-- 3. Create your first season: POST /api/seasons/create
-- 4. Set up cron jobs for points processing
-- 5. Start trading and earning points!
-- ============================================================================