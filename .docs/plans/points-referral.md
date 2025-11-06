# Points-Based Community Engagement & Referral System

## Overview
Build a complete points and referral system integrated with existing Thetanuts fillOrder() tracking, featuring profit-weighted points, tiered referral bonuses, 12-week seasons, and mobile-friendly UI.

## Database Schema Extensions

### New Tables (add to `supabase/schema.sql`)

**1. `user_points`** - Track cumulative and seasonal points
- `wallet_address` (PK)
- `total_points` (lifetime)
- `current_season_points`
- `current_season_id`
- `referral_code` (unique 6-char alphanumeric)
- `referred_by` (wallet address)
- `active_referrals_count` (cached count)
- `created_at`, `updated_at`

**2. `point_transactions`** - Audit log of all point changes
- `id` (UUID PK)
- `wallet_address`
- `points_earned`
- `transaction_type` (TRADE, REFERRAL_BONUS, ADMIN_ADJUSTMENT)
- `source_tx_hash` (if from trade)
- `source_position_id` (FK to user_positions)
- `metadata` (JSONB - profit amount, trade details, etc.)
- `season_id`
- `created_at`

**3. `referrals`** - Track referral relationships
- `id` (UUID PK)
- `referrer_wallet`
- `referee_wallet`
- `referee_code_used`
- `is_active` (becomes true after first fillOrder)
- `first_trade_at`
- `total_trades_count`
- `total_points_generated` (for referrer bonuses)
- `created_at`

**4. `seasons`** - 12-week incentive periods
- `id` (UUID PK)
- `season_number`
- `start_date`
- `end_date`
- `is_active`
- `created_at`

**5. `weekly_leaderboard`** - Snapshot of weekly performance
- `id` (UUID PK)
- `wallet_address`
- `season_id`
- `week_number` (1-12 within season)
- `week_start_date`
- `week_end_date`
- `weekly_profit_usd`
- `weekly_points_earned`
- `rank`
- `created_at`

**6. `social_verifications`** (schema only for future)
- `wallet_address` (PK)
- `discord_id`, `discord_username`
- `telegram_id`, `telegram_username`
- `twitter_id`, `twitter_username`
- `verification_status`
- `verified_at`

### Indexes
- `idx_user_points_referral_code` on `user_points(referral_code)`
- `idx_point_transactions_wallet_season` on `point_transactions(wallet_address, season_id)`
- `idx_referrals_referrer` on `referrals(referrer_wallet)`
- `idx_weekly_leaderboard_season_week` on `weekly_leaderboard(season_id, week_number, rank)`

## Backend Implementation

### API Routes

**`/api/referrals/generate` (POST)**
- Generate unique 6-character alphanumeric referral code
- Ensure no collisions, store in `user_points` table
- Return referral link: `${baseUrl}/ref/${code}`

**`/api/referrals/validate` (POST)**
- Validate referral code and create referral relationship
- Check code exists, referee hasn't used another code
- Store in `referrals` table with `is_active=false`

**`/api/referrals/stats` (GET)**
- Query params: `wallet`
- Return referrer's stats: total referrals, active referrals, bonus multiplier, total bonus points

**`/api/points/balance` (GET)**
- Query params: `wallet`
- Return total points, season points, rank, point breakdown

**`/api/points/history` (GET)**
- Query params: `wallet`, `limit`, `offset`
- Return paginated point transaction history from `point_transactions`

**`/api/seasons/current` (GET)**
- Return current active season details

**`/api/seasons/create` (POST)** [Admin]
- Create new 12-week season
- Auto-transition from previous season

**`/api/leaderboard/weekly` (GET)**
- Query params: `season_id`, `week_number`
- Return top 100 by weekly profit

**`/api/leaderboard/season` (GET)**
- Query params: `season_id`
- Return top 100 by season points (profit-weighted)

### Core Services

**`src/services/pointsCalculator.ts`**
- `calculateTradePoints(position: DbUserPosition): number`
  - Base formula: `points = abs(pnl_usd) * profitMultiplier`
  - If profit > 0: `profitMultiplier = 10` (10 points per $1 profit)
  - If profit < 0: `profitMultiplier = 2` (2 points per $1 loss, encourages participation)
  - If profit = 0: `5 points` (flat participation bonus)

**`src/services/referralBonusCalculator.ts`**
- `calculateReferralBonus(referrerWallet: string, refereePoints: number): number`
  - Fetch active referrals count
  - Apply tiered multipliers:
    - < 10 active: flat 100 points per new active referee
    - >= 10 active: 1.2x multiplier on all referee points
    - >= 30 active: 1.5x multiplier on all referee points
  - Return bonus points to award referrer

**`src/services/pointsProcessor.ts`** (Cron job logic)
- Batch process unprocessed `user_positions` where `is_settled=true`
- For each settled position:
  1. Calculate trade points
  2. Check if user has referrer
  3. Award points to trader (record in `point_transactions`)
  4. Calculate and award referral bonus to referrer
  5. Update `user_points` cumulative totals
  6. Mark position as processed (add `points_processed` field to schema)

**`src/services/weeklyLeaderboardGenerator.ts`** (Weekly cron)
- Run Sunday night to calculate previous week's standings
- Group settled positions by week
- Calculate weekly profit per user
- Generate rankings and insert into `weekly_leaderboard`

### Cron Jobs (using Next.js API routes + external trigger)

**`/api/cron/process-points` (POST)** [Protected with secret token]
- Runs every 15 minutes
- Calls `pointsProcessor.ts` to batch process settled positions

**`/api/cron/weekly-snapshot` (POST)** [Protected with secret token]
- Runs weekly (Sunday 23:55 UTC)
- Calls `weeklyLeaderboardGenerator.ts`

## Frontend Implementation (Mobile-First)

### New Components

**`src/components/referrals/ReferralDashboard.tsx`**
- Display user's referral code with copy button
- Share buttons (Twitter, Telegram, copy link)
- Stats cards: total referrals, active referrals, bonus tier, total bonus points
- List of referred users (anonymized) with their status

**`src/components/points/PointsDisplay.tsx`**
- Prominent points balance with animated counter
- Season progress bar (weeks remaining)
- Quick stats: rank, points this week, next tier info
- Link to full history

**`src/components/points/PointsHistory.tsx`**
- Paginated list of point transactions
- Filter by type (trades, referral bonuses, adjustments)
- Show source transaction links to Basescan

**`src/components/leaderboard/WeeklyLeaderboard.tsx`**
- Tab-based: Current Week, Season Total, All-Time
- Top 100 display with user's rank highlighted
- Mobile-optimized table