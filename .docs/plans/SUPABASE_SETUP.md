# Supabase Setup Guide

This guide will help you set up Supabase for storing user positions and leaderboard data.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (you already have one at `bmuhhfnfxtocuxbfysxz.supabase.co`)

## 2. Set Up Database Schema

1. Go to your Supabase dashboard → SQL Editor
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the SQL in the SQL Editor
4. This will create:
   - `user_positions` table for storing bets
   - `leaderboard` view for aggregated stats
   - Indexes for better performance
   - Row Level Security policies

## 3. Configure Environment Variables

Your `.env` file needs these variables (already partially configured):

```env
# Supabase Public Keys (safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://bmuhhfnfxtocuxbfysxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to get your keys:

1. Go to Supabase Dashboard → Settings → API
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (already set)
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (update this)

## 4. What's Implemented

### Database Integration
- ✅ User positions automatically saved after trades
- ✅ PnL tracking (currently at 0, will be updated by price oracle)
- ✅ Cross-device sync via database
- ✅ Leaderboard with rankings by PnL, Win Rate, ROI

### Components Updated
- ✅ `MyBets.tsx` - Now fetches from database instead of localStorage
- ✅ `useBatchTrading.ts` - Saves positions after successful trades
- ✅ `Leaderboard.tsx` - New component for rankings (add to your app)

### API Routes
- ✅ `POST /api/positions` - Save new position
- ✅ `GET /api/positions?wallet=0x...` - Fetch user positions
- ✅ `GET /api/leaderboard?orderBy=total_pnl&limit=100` - Fetch rankings

## 5. Using the Leaderboard Component

Add to your app (e.g., in a new page or tab):

```tsx
import Leaderboard from '@/src/components/leaderboard/Leaderboard';

// In your component:
<Leaderboard currentWallet={walletAddress} />
```

## 6. Future Enhancements

To make PnL calculations work, you'll need to:

1. **Create a price oracle service** that:
   - Fetches current prices for BTC, ETH, SOL, XRP, BNB
   - Updates `current_price` in the database
   - Calculates PnL based on entry vs current price

2. **Create a cron job** (e.g., Vercel Cron) that:
   - Runs every 5-10 minutes
   - Updates prices and PnL for active positions
   - Settles expired positions with final PnL

Example cron endpoint structure:
```typescript
// src/app/api/cron/update-positions/route.ts
export async function GET(request: Request) {
  // 1. Fetch current prices
  // 2. Update all active positions with current_price
  // 3. Calculate PnL = (current - entry) * collateral for calls
  // 4. Settle expired positions
  // 5. Update leaderboard (automatic via view)
}
```

## 7. Testing

1. Make a bet using the swipe interface
2. Check the browser console for `[DATABASE]` logs
3. Verify the position appears in Supabase Dashboard → Table Editor → user_positions
4. Check the leaderboard component to see rankings

## Database Schema

### user_positions table
- Stores all user bets with full order details
- Tracks PnL and settlement status
- Indexed for fast queries

### leaderboard view
- Automatically aggregates stats from user_positions
- Calculates total PnL, win rate, ROI
- Updates in real-time as positions are added/settled

## Troubleshooting

### "Failed to save position"
- Check your Supabase anon key is correct in `.env`
- Verify the SQL schema was run successfully
- Check browser console and server logs for detailed errors

### Positions not showing in MyBets
- Ensure wallet address matches (case-insensitive)
- Check `/api/positions?wallet=YOUR_ADDRESS` returns data
- Verify RLS policies allow public read access

### Leaderboard empty
- Ensure positions have been created
- Check the leaderboard view exists in Supabase
- Verify `/api/leaderboard` returns data
