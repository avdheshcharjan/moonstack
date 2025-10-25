# Betting System Implementation Guide

## Overview

This betting system allows users to make YES/NO predictions on cryptocurrency prices. When a user swipes on an option card, the transaction is executed and recorded in Supabase for display in the "My Bets" section.

## Architecture

### Data Flow

```
User Swipes Card (YES/NO)
    ↓
executeDirectFillOrder() - Transaction executed
    ↓
Transaction Success
    ↓
storePosition() - Saves to Supabase
    ↓
User can view bet in "My Bets" tab
```

### Key Components

1. **Transaction Execution**: `src/services/directExecution.ts`
2. **API Endpoints**: `src/app/api/positions/route.ts`
3. **Database Schema**: `supabase/migrations/add_decision_to_positions.sql`
4. **UI Display**: `src/components/bets/MyBets.tsx`

## Database Schema

The system uses the existing `user_positions` table with these additional fields:

- `decision` (TEXT): 'YES' or 'NO' - The user's prediction
- `question` (TEXT): The prediction question (e.g., "Will BTC go above $100,000?")
- `threshold` (NUMERIC): The strike price threshold
- `bet_size` (NUMERIC): The amount wagered in USDC

### Table Structure

```sql
CREATE TABLE user_positions (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,

  -- Order details
  strategy_type TEXT NOT NULL,
  underlying TEXT NOT NULL,
  is_call BOOLEAN NOT NULL,
  strikes NUMERIC[] NOT NULL,
  strike_width NUMERIC NOT NULL,
  expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  price_per_contract NUMERIC NOT NULL,
  max_size NUMERIC NOT NULL,
  collateral_used NUMERIC NOT NULL,
  num_contracts TEXT NOT NULL,

  -- Bet-specific fields (NEW)
  decision TEXT CHECK (decision IN ('YES', 'NO')),
  question TEXT,
  threshold NUMERIC,
  bet_size NUMERIC,

  -- PnL tracking
  entry_price NUMERIC,
  current_price NUMERIC,
  pnl NUMERIC DEFAULT 0,
  pnl_percentage NUMERIC DEFAULT 0,
  is_settled BOOLEAN DEFAULT FALSE,
  settlement_price NUMERIC,
  settlement_timestamp TIMESTAMP WITH TIME ZONE,

  -- Metadata
  raw_order JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run Database Migration

Apply the migration to add the new fields to your `user_positions` table:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in your Supabase dashboard
# File: supabase/migrations/add_decision_to_positions.sql
```

### 2. Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Verify API Endpoints

The positions API should be accessible at:
- POST `/api/positions` - Create new bet record
- GET `/api/positions?wallet=0x...` - Fetch user bets

### 4. Test the Flow

1. Connect your wallet
2. Swipe YES or NO on a prediction card
3. Transaction executes
4. Navigate to "My Bets" tab
5. Verify your bet appears with:
   - YES/NO decision badge
   - Bet question
   - Bet size
   - Strike price
   - Transaction link

## API Usage

### Creating a Bet Record

When a transaction succeeds, the system automatically calls:

```typescript
POST /api/positions
Content-Type: application/json

{
  "wallet_address": "0x...",
  "tx_hash": "0x...",
  "decision": "YES",
  "question": "Will BTC go above $100,000?",
  "threshold": 100000,
  "betSize": 5.0,
  // ... other position fields
}
```

### Fetching User Bets

```typescript
GET /api/positions?wallet=0x...

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "wallet_address": "0x...",
      "decision": "YES",
      "question": "Will BTC go above $100,000?",
      "bet_size": 5.0,
      "threshold": 100000,
      "pnl": 0,
      "is_settled": false,
      // ... other fields
    }
  ]
}
```

## Code Structure

### Transaction Execution (`src/services/directExecution.ts`)

```typescript
export async function executeDirectFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<DirectExecutionResult>
```

This function:
1. Validates the order
2. Checks USDC balance
3. Approves USDC if needed
4. Executes the fillOrder transaction
5. Calls `storePosition()` to save the bet

### Storing Bet Data (`src/services/directExecution.ts`)

```typescript
async function storePosition(
  pair: BinaryPair,
  action: 'yes' | 'no',
  order: RawOrderData,
  txHash: Hex,
  walletAddress: Address,
  betSize: number
): Promise<void>
```

This function saves:
- Position data (existing)
- Bet-specific data:
  - `decision`: 'YES' or 'NO'
  - `question`: The prediction question
  - `threshold`: Strike price
  - `betSize`: Amount wagered

### Displaying Bets (`src/components/bets/MyBets.tsx`)

Features:
- Ongoing vs Completed tabs
- YES/NO decision badges
- Bet question display
- Bet size, strike, PnL, and countdown
- Transaction link to BaseScan
- Real-time countdown timers
- Auto-refresh every 30 seconds

## UI Features

### My Bets Tab

The "My Bets" section displays:

1. **Tab Switcher**: Toggle between Ongoing and Completed bets
2. **Bet Cards** showing:
   - Token logo
   - YES/NO decision badge (green/red)
   - Prediction question
   - Bet size in USDC
   - Strike price
   - Current PnL
   - Time remaining countdown
   - BaseScan transaction link

### Bet Card Layout

```
┌─────────────────────────────────────────────────┐
│ [Token Logo] BTC    YES                         │
│              Will BTC go above $100,000?        │
│                                                 │
│ Bet Size: $5.00 | Strike: $100,000             │
│ PnL: +$0.00     | Ends in: 2D:5H                │
│                                                 │
│ View on BaseScan: 0x1234...5678                │
└─────────────────────────────────────────────────┘
```

## Type Safety

All components use TypeScript with proper types:

```typescript
interface DbUserPosition {
  id: string;
  wallet_address: string;
  decision: 'YES' | 'NO';
  question: string | null;
  threshold: number | null;
  bet_size: number | null;
  // ... other fields
}
```

## Error Handling

The system handles errors gracefully:
- Transaction failures don't block the app
- Database errors are logged but don't crash
- Missing data shows fallbacks (e.g., "N/A")
- Users can retry failed operations

## Future Enhancements

Potential improvements:
1. Real-time PnL updates
2. Settlement automation
3. Filtering by underlying asset
4. Export to CSV
5. Social sharing
6. Bet history analytics
7. Notification system for settlements

## Troubleshooting

### Bets not appearing

1. Check browser console for errors
2. Verify Supabase connection
3. Check migration ran successfully
4. Ensure wallet address matches

### Transaction but no bet record

1. Check API endpoint logs
2. Verify `storePosition()` is being called
3. Check Supabase table permissions
4. Verify all required fields are present

### Type errors

Run type check:
```bash
npm run type-check
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase logs
3. Check transaction on BaseScan
4. Verify database schema matches expected structure

## Summary

This betting system provides a complete end-to-end solution for:
- Recording user predictions (YES/NO)
- Storing bet details in Supabase
- Displaying bet history with real-time updates
- Tracking PnL and settlement status

All while maintaining type safety, error handling, and a great user experience.
