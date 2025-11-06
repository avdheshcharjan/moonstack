# Schema Update Summary - Points & Referral System

## Overview
This document summarizes the schema updates made to align with the leaderboard and referral point system implementation.

## Key Changes Made

### 1. **Enhanced Indexes for Performance**
- Added `idx_point_transactions_source_position` for faster position lookups
- Added `idx_weekly_leaderboard_profit` for profit-based queries
- Added `idx_weekly_leaderboard_points` for points-based queries

### 2. **Improved Materialized View**
- Enhanced error handling in materialized view creation
- Added fallback logic if `user_positions` table doesn't exist
- Better exception handling for view creation

### 3. **Better Documentation**
- Added comprehensive column comments explaining each field's purpose
- Clarified that `weekly_leaderboard` is sorted by profit (not just points)
- Documented referral tracking fields

### 4. **Bug Fix in Code**
- Fixed `total_points_generated` calculation in `pointsProcessor.ts`
  - **Before**: Was incorrectly using `total_trades_count + bonus_points`
  - **After**: Now correctly accumulates referee's points that generated bonuses

## Schema Structure

### Tables Created

1. **seasons** - 12-week incentive periods
2. **user_points** - Points balance and referral codes per user
3. **point_transactions** - Complete audit log of point changes
4. **referrals** - Referral relationships and activation status
5. **weekly_leaderboard** - Weekly profit-based snapshots
6. **social_verifications** - Future social verification (schema ready)

### Key Relationships

- `user_points.referred_by` → `user_points.wallet_address` (self-reference)
- `referrals.referrer_wallet` → `user_points.wallet_address` (FK)
- `point_transactions.season_id` → `seasons.id` (FK)
- `weekly_leaderboard.season_id` → `seasons.id` (FK)
- `user_points.current_season_id` → `seasons.id` (FK)

### Indexes for Query Performance

**user_points:**
- `referral_code` (unique lookup)
- `referred_by` (find who referred me)
- `current_season_points DESC` (season leaderboard)
- `total_points DESC` (all-time leaderboard)

**point_transactions:**
- `wallet_address` (user history)
- `wallet_address, season_id` (season history)
- `transaction_type` (filter by type)
- `created_at DESC` (recent first)
- `source_position_id` (link to position)

**referrals:**
- `referrer_wallet` (find all my referrals)
- `referee_wallet` (find my referrer)
- `is_active` (filter active referrals)
- `referee_code_used` (code lookup)

**weekly_leaderboard:**
- `season_id, week_number, rank` (weekly rankings)
- `wallet_address` (user's weekly history)
- `weekly_profit_usd DESC` (profit ranking)
- `weekly_points_earned DESC` (points ranking)

## Query Patterns Supported

### Leaderboard Queries
1. **Season Leaderboard**: Uses materialized view `current_season_leaderboard` for fast queries
2. **Weekly Leaderboard**: Queries `weekly_leaderboard` table sorted by `weekly_profit_usd`
3. **All-Time Leaderboard**: Queries `user_points` sorted by `total_points`

### Referral Queries
1. **Get Referral Stats**: Queries `referrals` grouped by `referrer_wallet`
2. **Check Active Referrals**: Filters by `is_active = true`
3. **Find Referrer**: Queries `referrals` by `referee_wallet`

### Points Queries
1. **Points Balance**: Queries `user_points` for current totals
2. **Points History**: Queries `point_transactions` filtered by wallet and type
3. **Points Breakdown**: Aggregates `point_transactions` by `transaction_type`

## Performance Optimizations

1. **Materialized View**: `current_season_leaderboard` refreshes periodically for fast season queries
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **Partial Indexes**: Indexes with WHERE clauses for filtered queries
4. **Descending Indexes**: For sorting leaderboards efficiently

## Data Integrity

- Foreign keys ensure referential integrity
- Unique constraints prevent duplicate referral codes and referee entries
- Check constraints validate transaction types and week numbers
- NOT NULL constraints on critical fields

## Row Level Security (RLS)

All tables have RLS enabled with:
- **Public read access** for leaderboards and public data
- **System write access** for API endpoints (auth handled at API level)
- **No user-specific restrictions** (all users can read all data for transparency)

## Migration Notes

The schema is **idempotent** - you can run it multiple times safely:
- Uses `IF NOT EXISTS` for tables
- Drops and recreates constraints if needed
- Checks for column existence before adding
- Handles missing tables gracefully

## Next Steps After Schema Creation

1. Create first season via API: `POST /api/seasons/create`
2. Set up cron jobs:
   - `/api/cron/process-points` every 15 minutes
   - `/api/cron/weekly-snapshot` every Sunday 23:55 UTC
3. Test the system:
   - Generate a referral code
   - Make a trade
   - Verify points are awarded within 15 minutes
   - Check leaderboard updates

## Known Issues Fixed

1. ✅ Fixed `total_points_generated` calculation bug in pointsProcessor
2. ✅ Added proper error handling for materialized view creation
3. ✅ Enhanced indexes for better query performance
4. ✅ Added comprehensive documentation

