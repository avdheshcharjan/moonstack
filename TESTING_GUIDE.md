# End-to-End Testing Guide - Points & Referral System

This guide walks you through testing the complete Moonstack points and referral system from database setup to user flow.

## Prerequisites

- ✅ Supabase project created
- ✅ Environment variables configured (`.env.local`)
- ✅ Next.js app running locally

## Part 1: Database Setup

### Step 1: Run the Complete Setup Script

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/complete_setup.sql`
5. Paste and click **Run**

**Expected Output:**
```
Success: No rows returned
```

You should see notices about:
- Classic leaderboard view created (if `user_positions` exists)
- Points system tables created
- Materialized view created

### Step 2: Verify Schema Setup

**Method 1: Use the Verification Endpoint**

Visit in your browser or use curl:
```bash
curl http://localhost:3000/api/admin/verify-schema
```

**Expected Response:**
```json
{
  "status": "partial",  // or "critical" if no season exists yet
  "tables": {
    "user_positions": { "exists": true },
    "seasons": { "exists": true },
    "user_points": { "exists": true },
    "point_transactions": { "exists": true },
    "referrals": { "exists": true },
    "weekly_leaderboard": { "exists": true }
  },
  "views": {
    "leaderboard": { "exists": true },
    "current_season_leaderboard": { "exists": true }
  },
  "data_counts": {
    "seasons": 0,
    "user_points": 0,
    "point_transactions": 0,
    "referrals": 0
  },
  "issues": [
    "No active season found"
  ],
  "recommendations": [
    "Create first season: POST /api/seasons/create with ADMIN_SECRET"
  ]
}
```

**Method 2: Manual Supabase Check**

In Supabase SQL Editor, run:
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_positions', 
    'seasons', 
    'user_points', 
    'point_transactions', 
    'referrals', 
    'weekly_leaderboard',
    'social_verifications'
  )
ORDER BY table_name;

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name IN ('leaderboard', 'current_season_leaderboard');
```

**Expected:** 7 tables + 2 views = 9 results

## Part 2: Create First Season

### Step 3: Create Season via API

**Required:** Set `ADMIN_SECRET` in your `.env.local`:
```env
ADMIN_SECRET=your-secret-key-here
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/seasons/create \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-secret-key-here" \
  -d '{
    "season_number": 1,
    "start_date": "2025-01-01T00:00:00Z",
    "duration_weeks": 12
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "season": {
    "id": "uuid-here",
    "season_number": 1,
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-03-26T00:00:00.000Z",
    "is_active": true
  }
}
```

### Step 4: Verify Season Creation

**Request:**
```bash
curl http://localhost:3000/api/seasons/current
```

**Expected Response:**
```json
{
  "success": true,
  "current_season": {
    "id": "uuid-here",
    "season_number": 1,
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-03-26T00:00:00.000Z",
    "is_active": true,
    "days_remaining": 80,
    "weeks_remaining": 11
  },
  "current_week_number": 1
}
```

## Part 3: Test User Flow - Trade → Points → Leaderboard

### Step 5: Connect Wallet and Make a Trade

1. **Open the app:** `http://localhost:3000`
2. **Connect wallet** using Base Account
3. **Navigate to Play tab**
4. **Make a prediction** (e.g., "Will ETH reach $4000?")
5. **Execute trade** using the swipe interface

**What happens:**
- Trade is recorded in `user_positions` table
- Referral code is auto-generated for your wallet (in `directExecution.ts`)
- Entry appears in "My Bets" tab

### Step 6: Generate and Share Referral Code

1. **Navigate to Referrals tab**
2. **View your referral code** (auto-generated from first trade)
3. **Copy referral link** (e.g., `https://moonstack.xyz/ref/ABC123`)

**Verify via API:**
```bash
curl http://localhost:3000/api/referrals/stats?wallet=YOUR_WALLET_ADDRESS
```

**Expected Response:**
```json
{
  "success": true,
  "total_referrals": 0,
  "active_referrals": 0,
  "inactive_referrals": 0,
  "bonus_multiplier": 1,
  "bonus_tier": "FLAT",
  "total_bonus_points": 0,
  "referral_code": "ABC123",
  "referral_link": "https://moonstack.xyz/ref/ABC123",
  "referees": []
}
```

### Step 7: Simulate Referral (Second User)

1. **Open incognito/private window**
2. **Visit referral link:** `http://localhost:3000/ref/ABC123`
3. **Connect a different wallet**
4. **Make a trade**

**What happens:**
- Referral relationship created in `referrals` table
- When referee makes first trade:
  - `is_active` set to `true`
  - Referrer's `active_referrals_count` incremented

### Step 8: Settle Position (Mark as Complete)

**Option 1: Wait for Expiry**
- Positions auto-settle when expiry time passes
- Settlement updates `is_settled` and calculates `pnl`

**Option 2: Manual Settlement (for testing)**

In Supabase SQL Editor:
```sql
-- Find your position
SELECT id, wallet_address, pnl, is_settled, points_processed
FROM user_positions
WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
ORDER BY created_at DESC
LIMIT 1;

-- Mark position as settled with profit (for testing)
UPDATE user_positions
SET 
  is_settled = true,
  pnl = 10.50,  -- $10.50 profit
  settlement_price = entry_price * 1.1,
  settlement_timestamp = NOW(),
  points_processed = false  -- Important: must be false for cron to process
WHERE id = 'POSITION_ID';
```

### Step 9: Trigger Points Processing

**Automatic:** Points are processed every 15 minutes by cron job

**Manual Trigger (for testing):**

**Required:** Set `CRON_SECRET` in `.env.local`:
```env
CRON_SECRET=your-cron-secret-here
```

```bash
curl -X POST http://localhost:3000/api/cron/process-points \
  -H "Authorization: Bearer your-cron-secret-here"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 1,
  "total_points_awarded": 105,
  "referral_bonuses_awarded": 0,
  "errors": []
}
```

**Points Calculation:**
- **Profit ($10.50):** 10.50 × 10 = **105 points**
- **Loss example ($5):** 5 × 2 = **10 points**
- **Break-even:** **5 points**

### Step 10: Verify Points Awarded

**Check User Points:**
```bash
curl http://localhost:3000/api/points/balance?wallet=YOUR_WALLET_ADDRESS
```

**Expected Response:**
```json
{
  "success": true,
  "points": {
    "total_points": 105,
    "current_season_points": 105,
    "season_rank": 1,
    "total_rank": 1
  }
}
```

**Check Points History:**
```bash
curl http://localhost:3000/api/points/history?wallet=YOUR_WALLET_ADDRESS
```

**Expected Response:**
```json
{
  "success": true,
  "total_count": 1,
  "transactions": [
    {
      "id": "uuid",
      "points_earned": 105,
      "transaction_type": "TRADE",
      "source_tx_hash": "0x...",
      "created_at": "2025-01-15T10:30:00Z",
      "metadata": {
        "profit_usd": 10.5,
        "position_id": "..."
      }
    }
  ]
}
```

### Step 11: Verify Leaderboards

**Season Leaderboard:**
```bash
curl http://localhost:3000/api/leaderboard/season?limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "season": {
    "id": "uuid",
    "season_number": 1
  },
  "entries": [
    {
      "wallet_address": "0x...",
      "current_season_points": 105,
      "active_referrals_count": 0,
      "total_trades": 1,
      "winning_trades": 1,
      "total_profit": 10.5,
      "rank": 1
    }
  ]
}
```

**Classic Leaderboard (Volume-Based):**
```bash
curl http://localhost:3000/api/leaderboard?orderBy=total_pnl&limit=10
```

### Step 12: Test Referral Bonuses

When your referee's position settles and points are processed:

**Bonus Tiers:**
- **< 10 active referrals:** 100 points flat per active referee
- **≥ 10 active referrals:** 1.2x multiplier on referee's points
- **≥ 30 active referrals:** 1.5x multiplier on referee's points

**Example:**
1. Referee earns 50 points from a trade
2. Referrer (with < 10 referrals) gets: **100 points bonus**
3. Referrer (with ≥ 10 referrals) gets: **50 × 1.2 = 60 points**

**Verify Referral Stats:**
```bash
curl http://localhost:3000/api/referrals/stats?wallet=REFERRER_WALLET
```

**Expected Response:**
```json
{
  "total_referrals": 1,
  "active_referrals": 1,
  "bonus_tier": "FLAT",
  "total_bonus_points": 100,
  "referees": [
    {
      "wallet_address": "0x...",
      "is_active": true,
      "first_trade_at": "2025-01-15T11:00:00Z",
      "total_trades_count": 1,
      "total_points_generated": 50
    }
  ]
}
```

## Part 4: Frontend Integration Testing

### Step 13: Verify UI Components

**Points Display (Top Bar):**
1. Navigate to home page
2. Verify points badge shows in top bar
3. Click badge → should navigate to `/points`

**Points Page:**
1. Visit `/points`
2. Verify **Season Tracker** shows current season info
3. Verify **Overview tab** shows:
   - Total points
   - Season points
   - Season rank
   - Points breakdown chart
4. Switch to **History tab**
5. Verify transaction history displays
6. Test filters (TRADE, REFERRAL_BONUS, ADMIN_ADJUSTMENT)

**Referral Dashboard:**
1. Navigate to **Referrals tab**
2. Verify referral code displays
3. Verify bonus tier indicator shows
4. Test **Copy Code** button
5. Test **Share** button → should open share modal
6. Verify referees list (if any)

**Leaderboard:**
1. Navigate to **Leaders tab**
2. Verify toggle between **Points** and **Classic** views
3. In **Points view:**
   - Verify Season Tracker displays
   - Test tabs: Season / Weekly
   - Verify your wallet is highlighted
4. In **Classic view:**
   - Verify volume-based rankings
   - Verify stats (Total PnL, Win Rate, ROI)

**Referral Landing Page:**
1. Share referral link with someone
2. Have them visit: `/ref/YOUR_CODE`
3. Verify landing page displays:
   - Referral code prominently
   - Connect wallet prompt
   - Feature highlights
4. After connection, verify:
   - "Referral Applied!" success message
   - Auto-redirect to home

## Part 5: Cron Jobs Setup

### Step 14: Configure Cron Jobs (Production)

For production, set up these cron jobs:

**Points Processing (Every 15 minutes):**
```bash
*/15 * * * * curl -X POST https://your-domain.com/api/cron/process-points \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Weekly Leaderboard Snapshot (Every Sunday 23:55 UTC):**
```bash
55 23 * * 0 curl -X POST https://your-domain.com/api/cron/weekly-snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Using Vercel Cron (Recommended):**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-points",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/weekly-snapshot",
      "schedule": "55 23 * * 0"
    }
  ]
}
```

### Step 15: Test Weekly Snapshot Generation

```bash
curl -X POST http://localhost:3000/api/cron/weekly-snapshot \
  -H "Authorization: Bearer your-cron-secret-here"
```

**Expected Response:**
```json
{
  "success": true,
  "entries_saved": 5,
  "season_id": "uuid",
  "week_number": 1
}
```

**Verify Weekly Leaderboard:**
```bash
curl "http://localhost:3000/api/leaderboard/weekly?season_id=SEASON_UUID&week_number=1"
```

## Troubleshooting

### Issue: "Classic leaderboard not set up"

**Solution:**
1. Verify `user_positions` table exists in Supabase
2. Re-run `complete_setup.sql` script
3. Check `/api/admin/verify-schema` for details

### Issue: Points not being awarded

**Checklist:**
- [ ] Position is marked as `is_settled = true`
- [ ] Position has `points_processed = false`
- [ ] Active season exists
- [ ] Cron job ran successfully
- [ ] Check logs in `/api/cron/process-points`

### Issue: Referral not activated

**Checklist:**
- [ ] Referee used correct referral code
- [ ] Referee completed at least one trade
- [ ] Trade is settled
- [ ] Points processing ran after settlement

### Issue: Materialized view not updating

**Solution:**
Manually refresh in Supabase SQL Editor:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_leaderboard;
```

Or via API (cron job does this automatically):
```bash
curl -X POST http://localhost:3000/api/cron/process-points \
  -H "Authorization: Bearer your-cron-secret-here"
```

## Testing Checklist

- [ ] Database schema deployed
- [ ] All tables and views exist (verified via `/api/admin/verify-schema`)
- [ ] Season 1 created and active
- [ ] User can connect wallet
- [ ] User can make a trade
- [ ] Referral code auto-generated on first trade
- [ ] Position settlement works
- [ ] Points processing works (manual trigger)
- [ ] Points appear in UI correctly
- [ ] Season leaderboard displays correctly
- [ ] Weekly leaderboard displays correctly
- [ ] Classic leaderboard displays correctly
- [ ] Referral link works for new users
- [ ] Referee's first trade activates referral
- [ ] Referral bonus points awarded correctly
- [ ] Bonus tier upgrades work (10+ and 30+ referrals)
- [ ] All UI components display data correctly
- [ ] Share functionality works (Twitter, Telegram, native)
- [ ] Mobile responsive design verified

## Next Steps

1. **Seed Test Data:** Create sample users and trades for realistic testing
2. **Monitor Cron Jobs:** Ensure they run on schedule in production
3. **Set up Alerts:** Monitor for failed points processing or leaderboard updates
4. **User Feedback:** Gather feedback on points UI and referral flow
5. **Analytics:** Track referral conversion rates and point distribution

## Support

If you encounter issues:
1. Check `/api/admin/verify-schema` for database state
2. Review server logs for error messages
3. Verify environment variables are set correctly
4. Ensure Supabase connection is working
5. Check that all API routes return expected responses

For additional help, refer to:
- `SCHEMA_UPDATE_SUMMARY.md` - Database schema details
- `POINTS_REFERRAL_SYSTEM_README.md` - System overview
- `supabase_points_referral_schema.sql` - Original schema file

