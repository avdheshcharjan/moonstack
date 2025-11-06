# OptionBook API Integration Summary

## Overview

Successfully replaced Supabase database with direct API calls to the OptionBook/Odette APIs for fetching user positions and leaderboard data. All position data is now fetched directly from the blockchain via Odette's indexer and filtered by our `REFERRER_ADDRESS`.

## Changes Made

### 1. Type Definitions (`src/types/orders.ts`)

Added comprehensive type definitions for Odette API responses:

- `OdettePosition` - Full position data from Odette API
- `OdetteSettlement` - Settlement information for completed positions
- `OpenPositionsResponse` - Response format for all open positions endpoint
- `LeaderboardEntry` - Aggregated leaderboard statistics

### 2. Positions API Route (`src/app/api/positions/route.ts`)

**GET `/api/positions?wallet=0x...`**
- Fetches both open positions and history (settled positions) from Odette API
- Filters all positions by `REFERRER_ADDRESS` to show only positions from our platform
- Transforms Odette format to internal display format
- Calculates PnL from settlement data for completed positions
- Returns combined list of open and settled positions

**POST `/api/positions`**
- Stub endpoint for backward compatibility (no longer stores to database)
- Returns success without storing data
- Positions are automatically indexed by Odette after trades

**Endpoints Used:**
- `https://odette.fi/api/user/{wallet}/positions` - Open positions
- `https://odette.fi/api/user/{wallet}/history` - Settled positions

### 3. Leaderboard API Route (`src/app/api/leaderboard/route.ts`)

**GET `/api/leaderboard?orderBy=total_pnl&limit=100`**
- Fetches all open positions from Odette API
- Filters by `REFERRER_ADDRESS` to get only our platform's users
- Extracts unique wallet addresses
- Fetches history for each wallet in parallel
- Aggregates statistics per wallet:
  - Total bets (open + settled)
  - Settled bets count
  - Win rate (from settled positions with payout)
  - Total PnL (sum of payouts minus entry costs)
  - ROI percentage
  - Total volume traded
- Caches results for 30 seconds to improve performance
- Sorts by requested field (total_pnl, win_rate, roi_percentage)

**Endpoints Used:**
- `https://odette.fi/api/open-positions` - All open positions (to find unique wallets)
- `https://odette.fi/api/user/{wallet}/positions` - User's open positions
- `https://odette.fi/api/user/{wallet}/history` - User's settled positions

### 4. My Bets Component (`src/components/bets/MyBets.tsx`)

- Updated to use new `Position` type from API
- Uses `status` and `is_settled` fields to filter ongoing vs completed
- Displays settlement data (settlement price, actual PnL) for completed positions
- Shows real PnL calculated from `settlement.payoutBuyer` minus entry costs

### 5. Leaderboard Component (`src/components/leaderboard/Leaderboard.tsx`)

- Updated import to use `LeaderboardEntry` from `types/orders`
- No other changes needed (API returns same format)

## Key Technical Details

### Referrer Filtering

All positions are filtered by:
```typescript
position.referrer?.toLowerCase() === REFERRER_ADDRESS.toLowerCase()
```

This ensures we only show positions created through our platform, not from other platforms using the same OptionBook contract.

**Important:** The `referrer` field is set when calling `fillOrder()` and is used to track which platform created the position.

### PnL Calculation

**Entry Cost:**
```typescript
entryPremium (6 decimals) + entryFeePaid (6 decimals)
```

**Settlement Payout (for settled positions):**
```typescript
settlement.payoutBuyer (6 decimals)
```

**PnL:**
```typescript
pnl = payoutBuyer - entryCost
roi = (pnl / entryCost) * 100
```

### Decimal Handling

- **USDC amounts**: 6 decimals (entryPremium, entryFeePaid, payoutBuyer, numContracts, collateralAmount)
- **Strikes**: 8 decimals
- **Settlement prices**: 8 decimals

### Caching

The leaderboard route implements 30-second caching to improve performance:
- Reduces API calls to Odette
- Decreases response time for subsequent requests
- Still provides reasonably fresh data

## Testing Checklist

### 1. Test Positions Fetching

**Test with a wallet that has positions:**
```bash
# Replace with an actual wallet address that has trades
curl "http://localhost:3000/api/positions?wallet=0x..."
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "0x...",
      "wallet_address": "0x...",
      "status": "open" or "settled",
      "underlying": "BTC" or "ETH",
      "strikes": [95000, 100000],
      "pnl": 0 or calculated value,
      "is_settled": false or true,
      ...
    }
  ],
  "count": 1
}
```

**Verify:**
- [ ] Only positions with `referrer === REFERRER_ADDRESS` are returned
- [ ] Both open and settled positions are included
- [ ] PnL is calculated correctly for settled positions
- [ ] Strikes are in human-readable format (divided by 1e8)

### 2. Test Leaderboard Aggregation

```bash
curl "http://localhost:3000/api/leaderboard?orderBy=total_pnl&limit=10"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "wallet_address": "0x...",
      "total_bets": 5,
      "settled_bets": 3,
      "winning_bets": 2,
      "losing_bets": 1,
      "win_rate": 66.7,
      "total_pnl": 150.50,
      "roi_percentage": 25.5,
      "total_volume": 590.00
    },
    ...
  ],
  "cached": false
}
```

**Verify:**
- [ ] Only users who traded through our platform (REFERRER_ADDRESS) are shown
- [ ] Stats are calculated correctly (win_rate, total_pnl, roi_percentage)
- [ ] Leaderboard is sorted by requested field
- [ ] Second request within 30 seconds returns cached data

### 3. Test My Bets UI

**Steps:**
1. Connect wallet in the UI
2. Navigate to "My Bets" page
3. Check that positions load correctly

**Verify:**
- [ ] Ongoing positions appear in "Ongoing" tab
- [ ] Completed positions appear in "Completed" tab
- [ ] PnL is displayed correctly for settled positions
- [ ] Settlement price is shown for completed positions
- [ ] Time remaining countdown works for ongoing positions
- [ ] Transaction links work correctly

### 4. Test Leaderboard UI

**Steps:**
1. Navigate to Leaderboard page
2. Wait for data to load

**Verify:**
- [ ] Leaderboard loads and displays users
- [ ] Current user's wallet is highlighted with "YOU" badge
- [ ] Stats are formatted correctly (win rate, PnL, ROI)
- [ ] BaseName or address is displayed for each user
- [ ] Footer stats show correct totals

### 5. Test After Making a Trade

**Steps:**
1. Make a trade through the platform
2. Wait for transaction to confirm
3. Wait ~15-30 seconds for Odette to index
4. Refresh My Bets page

**Verify:**
- [ ] New position appears in My Bets
- [ ] Position is filtered by our REFERRER_ADDRESS
- [ ] Entry details are correct
- [ ] Position appears in Leaderboard (if first trade for user)

## Performance Considerations

### Leaderboard Performance

The leaderboard route may be slow with many users because it:
1. Fetches all open positions (~1 API call)
2. For each unique wallet, fetches history (~N API calls)

**Optimization strategies:**
- ✅ Implemented 30-second caching
- Consider increasing cache duration if needed
- Consider implementing server-side user list storage (defeats purpose of no-database approach)
- Alternatively, only aggregate top N users by open position volume

### API Rate Limits

Be aware of potential rate limits from Odette API:
- If hitting rate limits, increase cache duration
- Consider implementing exponential backoff for retries
- Monitor API response times in production

## Troubleshooting

### Positions Not Showing

**Possible causes:**
1. Wrong REFERRER_ADDRESS - Check `src/utils/contracts.ts`
2. Positions not indexed yet - Wait 15-30 seconds after trade
3. User has no positions - Verify on https://odette.fi directly
4. API error - Check browser console / server logs

### Leaderboard Empty or Slow

**Possible causes:**
1. No users have traded yet
2. No settled positions yet (win_rate, PnL require settlements)
3. API timeout - Check server logs
4. Wrong REFERRER_ADDRESS filter

### PnL Showing Zero

**Possible causes:**
1. Position not settled yet (open positions show 0 PnL)
2. Settlement data not available from API
3. Decimal conversion error (check console for NaN)

## Configuration

### Referrer Address

The referrer address is defined in `src/utils/contracts.ts`:

```typescript
export const REFERRER_ADDRESS = '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567';
```

**Important:** This address must match the address you pass to `fillOrder()` when executing trades. If they don't match, positions won't be filtered correctly.

### API Endpoints

All endpoints are defined in the route files:

```typescript
const ODETTE_API_BASE = 'https://odette.fi/api';
```

### Cache Duration

Leaderboard cache is set in `src/app/api/leaderboard/route.ts`:

```typescript
const CACHE_DURATION = 30000; // 30 seconds
```

Adjust if needed based on traffic and freshness requirements.

## Migration Notes

### What Was Removed

- Supabase database calls for storing positions
- Supabase database calls for storing leaderboard data
- POST endpoint for saving positions (replaced with stub)
- Database schema dependencies

### What Remains

- `src/utils/supabase.ts` - Kept for reference, but no longer used
- POST calls to `/api/positions` from trade execution code - Now return success without storing

### Breaking Changes

None - The API interfaces remain the same, only the data source changed.

## Future Improvements

1. **Real-time Updates**: Implement WebSocket or polling for live position updates
2. **Better Caching**: Use Redis or similar for distributed caching
3. **Pagination**: Add pagination to leaderboard for better performance
4. **Historical Charts**: Track user performance over time
5. **Filtering**: Add filters for specific tokens, date ranges, strategy types
6. **Search**: Allow searching for specific wallet addresses in leaderboard

## Support

For issues or questions:
1. Check OptionBook.md for API documentation
2. Check browser console for errors
3. Check server logs for API failures
4. Verify REFERRER_ADDRESS matches your platform's address
5. Test API endpoints directly with curl to isolate issues

