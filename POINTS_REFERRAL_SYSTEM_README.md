# Points & Referral System - Complete Guide

## Overview

Moonstack now includes a comprehensive points-based community engagement and referral system. Users earn points for trading activity (calling `fillOrder()` on Thetanuts contracts), with points weighted by trade profitability. The system includes tiered referral bonuses, 12-week seasons, and weekly leaderboards.

## Key Features

- **Profit-Weighted Points**: 10 points per $1 profit, 2 points per $1 loss (encourages participation)
- **Tiered Referral Bonuses**: 
  - <10 active referrals: Flat 100 points per new active referee
  - ≥10 active referrals: 1.2x multiplier on all referee points
  - ≥30 active referrals: 1.5x multiplier on all referee points
- **12-Week Seasons**: Competitive seasons with weekly snapshots
- **Weekly Leaderboards**: Rankings based on weekly profit, fostering skill-based competition
- **Airdrop-Ready**: All points tracked for future token allocation
- **Mobile-Friendly UI**: Responsive design optimized for mobile devices

## Setup Instructions

### 1. Database Migration

Run the migration to create all necessary tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor:
# Paste contents of: supabase/migrations/create_points_system.sql
```

This creates:
- `user_points` - Track cumulative and seasonal points
- `point_transactions` - Audit log of all point changes
- `referrals` - Track referral relationships
- `seasons` - 12-week incentive periods
- `weekly_leaderboard` - Weekly performance snapshots
- `social_verifications` - Future social verification (schema only)

### 2. Environment Variables

Add these to your `.env.local`:

```env
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BASE_URL=https://moonstack.fun

# New variables for points system
CRON_SECRET=your_random_secret_token_here
ADMIN_SECRET=your_admin_secret_here
```

**Generate secrets:**
```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create First Season

Make an authenticated POST request to create the first season:

```bash
curl -X POST https://moonstack.fun/api/seasons/create \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01T00:00:00Z"
  }'
```

**Or use the API in your browser console (for localhost):**
```javascript
fetch('http://localhost:3000/api/seasons/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_SECRET',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ start_date: new Date().toISOString() })
}).then(r => r.json()).then(console.log);
```

### 4. Set Up Cron Jobs

Points are awarded through batch processing. Set up two cron jobs:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:

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

Add cron secret as environment variable in Vercel dashboard.

#### Option B: External Cron Service

Use [cron-job.org](https://cron-job.org) or similar:

**Points Processing (Every 15 minutes):**
- URL: `https://moonstack.fun/api/cron/process-points`
- Method: POST
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: `*/15 * * * *`

**Weekly Snapshot (Every Sunday 23:55 UTC):**
- URL: `https://moonstack.fun/api/cron/weekly-snapshot`
- Method: POST
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: `55 23 * * 0`

### 5. Verify Setup

Test the endpoints:

```bash
# Check if season was created
curl https://moonstack.fun/api/seasons/current

# Generate a referral code (replace with real wallet)
curl -X POST https://moonstack.fun/api/referrals/generate \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x..."}'

# Test points balance (after some trades)
curl https://moonstack.fun/api/points/balance?wallet=0x...

# Test cron (protected)
curl -X POST https://moonstack.fun/api/cron/process-points \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

### Points Calculation

When a user's position settles, the cron job calculates points:

```javascript
if (profit > 0) {
  points = profit_usd * 10  // 10 points per $1 profit
} else if (profit < 0) {
  points = abs(profit_usd) * 2  // 2 points per $1 loss
} else {
  points = 5  // 5 points for break-even
}
```

### Referral Flow

1. **User A generates referral code**: Automatic on first trade or via `/referrals` page
2. **User B uses code**: Visit `/ref/ABC123` or enter code manually
3. **User B trades**: First `fillOrder()` activates the referral
4. **User A earns bonus**: 
   - <10 active: 100 points flat
   - ≥10 active: 1.2x of all User B's future points
   - ≥30 active: 1.5x of all User B's future points

### Season Lifecycle

- **Duration**: 12 weeks (84 days)
- **Week Tracking**: Automatically calculated from season start date
- **Weekly Snapshots**: Generated every Sunday at 23:55 UTC
- **Leaderboard**: Real-time season rankings + historical weekly rankings

## API Reference

### Referrals

**Generate Code**
```
POST /api/referrals/generate
Body: { wallet_address: string }
Returns: { code, wallet_address, referral_link }
```

**Validate Code**
```
POST /api/referrals/validate
Body: { code: string, referee_wallet: string }
Returns: { valid: boolean, referrer_wallet?, error? }
```

**Get Stats**
```
GET /api/referrals/stats?wallet=0x...
Returns: { total_referrals, active_referrals, bonus_tier, total_bonus_points, referees[] }
```

### Points

**Get Balance**
```
GET /api/points/balance?wallet=0x...
Returns: { total_points, current_season_points, rank, season_rank, breakdown }
```

**Get History**
```
GET /api/points/history?wallet=0x...&limit=20&offset=0&type=TRADE
Returns: { transactions[], total, page, limit, hasMore }
```

### Seasons

**Get Current**
```
GET /api/seasons/current
Returns: { current_season, weeks_remaining, current_week_number, days_until_end }
```

**Create Season** (Admin)
```
POST /api/seasons/create
Headers: { Authorization: Bearer ADMIN_SECRET }
Body: { start_date?: string }
Returns: { success: boolean, season }
```

### Leaderboards

**Weekly**
```
GET /api/leaderboard/weekly?season_id=uuid&week_number=1&limit=100
Returns: { entries[], total_entries }
```

**Season**
```
GET /api/leaderboard/season?season_id=uuid&limit=100
Returns: { entries[], total_entries }
```

## User Features

### Points Page (`/points`)
- View total and seasonal points
- See current rank
- Track season progress
- View points history with filters
- Links to Basescan for transactions

### Referrals Page (`/referrals`)
- Display referral code with copy/share
- Show referral stats and tier
- List all referees with status
- Share on Twitter, Telegram, or native share

### Leaderboard Page (integrated)
- Toggle between "Points" and "Classic" view
- Season tracker with progress bar
- Weekly and seasonal rankings
- Highlight current user

### Referral Landing Page (`/ref/[code]`)
- Beautiful landing page for invite links
- Auto-applies code when wallet connects
- Shows features and benefits
- Redirects to home after success

## Anti-Sybil Measures

Current measures (Phase 1):
- Referral codes can only be used once per wallet
- Points only awarded for settled positions (real on-chain trades)
- Minimum trade size validation (via Thetanuts contracts)

Future measures (Phase 2 - schema ready):
- Discord/Telegram/Twitter verification required for airdrop
- Additional KYC for large allocations
- ML-based Sybil detection

## Troubleshooting

### Points not showing up
- Check if position is settled (`is_settled = true`)
- Verify cron job is running (check `/api/cron/process-points` endpoint)
- Check `points_processed` field on `user_positions` table

### Referral not activating
- Ensure referee has completed at least one trade
- Check `referrals` table for `is_active` status
- Verify referral code was applied before first trade

### Leaderboard not updating
- Weekly snapshots only generate on Sunday 23:55 UTC
- Season leaderboard updates in real-time via materialized view
- Manually refresh view: `REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_leaderboard;`

### Cron jobs not running
- Verify `CRON_SECRET` is set correctly in environment
- Check cron service logs
- Test endpoint manually with correct Authorization header

## Database Maintenance

### Refresh Materialized View
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_leaderboard;
```

### Check Unprocessed Positions
```sql
SELECT COUNT(*) FROM user_positions 
WHERE is_settled = true AND points_processed = false;
```

### Manual Point Award (Emergency)
```sql
INSERT INTO point_transactions (
  wallet_address, points_earned, transaction_type, metadata, season_id
) VALUES (
  '0x...', 1000, 'ADMIN_ADJUSTMENT', '{"reason": "correction"}', 'season-uuid'
);

-- Update user totals
UPDATE user_points 
SET total_points = total_points + 1000,
    current_season_points = current_season_points + 1000
WHERE wallet_address = '0x...';
```

## Future Enhancements

- [ ] Community challenges and events
- [ ] Bonus point multipliers for special periods
- [ ] NFT badges for top performers
- [ ] Social verification integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app push notifications
- [ ] Discord bot for stats

## Support

For issues or questions:
1. Check this README
2. Review API responses for error messages
3. Check Supabase logs
4. Contact dev team

---

**Built with ❤️ for the Moonstack community**

