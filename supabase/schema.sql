-- Create user_positions table to store all bets
CREATE TABLE IF NOT EXISTS user_positions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  -- Order details
  strategy_type TEXT NOT NULL,
  underlying TEXT NOT NULL,
  is_call BOOLEAN NOT NULL,
  strikes NUMERIC[] NOT NULL,
  strike_width NUMERIC NOT NULL,
  expiry TIMESTAMPTZ NOT NULL,
  price_per_contract NUMERIC NOT NULL,
  max_size NUMERIC NOT NULL,

  -- Position details
  collateral_used NUMERIC NOT NULL,
  num_contracts TEXT NOT NULL,

  -- PnL tracking
  entry_price NUMERIC,
  current_price NUMERIC,
  pnl NUMERIC DEFAULT 0,
  pnl_percentage NUMERIC DEFAULT 0,
  is_settled BOOLEAN DEFAULT false,
  settlement_price NUMERIC,
  settlement_timestamp TIMESTAMPTZ,

  -- Raw order data (JSONB for flexibility)
  raw_order JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_positions_wallet ON user_positions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_positions_underlying ON user_positions(underlying);
CREATE INDEX IF NOT EXISTS idx_user_positions_expiry ON user_positions(expiry);
CREATE INDEX IF NOT EXISTS idx_user_positions_is_settled ON user_positions(is_settled);
CREATE INDEX IF NOT EXISTS idx_user_positions_created_at ON user_positions(created_at DESC);

-- Create leaderboard view for aggregated stats
CREATE OR REPLACE VIEW leaderboard AS
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_positions_updated_at ON user_positions;
CREATE TRIGGER update_user_positions_updated_at
  BEFORE UPDATE ON user_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can read all positions (for leaderboard)
CREATE POLICY "Allow public read access" ON user_positions
  FOR SELECT USING (true);

-- Users can insert their own positions
CREATE POLICY "Allow insert for authenticated users" ON user_positions
  FOR INSERT WITH CHECK (true);

-- Users can update their own positions
CREATE POLICY "Allow update for own positions" ON user_positions
  FOR UPDATE USING (true);
