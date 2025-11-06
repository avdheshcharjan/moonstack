# Automatic Referral Code Generation System

## Overview
This document explains how referral codes are automatically generated when a user connects their wallet and how the database ensures accurate point tracking.

## Implementation

### 1. Service Layer: `src/services/referralService.ts`

#### `ensureReferralCode(walletAddress)` Function
- **Purpose**: Guarantees every wallet has a unique referral code
- **Idempotent**: Safe to call multiple times, won't create duplicates
- **Returns**: `{ code: string, isNew: boolean }` or `null` on error

**Logic Flow:**
```
1. Check if wallet already has code in user_points table
   ├─ YES → Return existing code
   └─ NO  → Generate new 6-char alphanumeric code
           ├─ Check for collisions (up to 10 attempts)
           ├─ Get current active season
           └─ Insert into user_points table
```

**Collision Handling:**
- Checks if generated code already exists
- Re-generates if collision detected (max 10 attempts)
- Handles race conditions (if another process creates record simultaneously)

#### `getReferralLink(walletAddress, baseUrl?)` Function
- Calls `ensureReferralCode` to get/generate code
- Returns full referral URL: `${baseUrl}/ref/${code}`

#### `validateReferralCode(code, refereeWallet)` Function
- Verifies code exists in database
- Prevents self-referral (can't use own code)
- Checks if user already used another code
- Returns validation result with referrer wallet address

### 2. Frontend Integration: `src/components/referrals/ReferralDashboard.tsx`

#### Auto-Generation on Component Mount
```typescript
useEffect(() => {
  initializeReferralCode();
}, [walletAddress]);

const initializeReferralCode = async () => {
  // 1. Ensure user has referral code
  const result = await ensureReferralCode(walletAddress);
  
  // 2. Log generation status
  if (result.isNew) {
    console.log('✨ Generated new referral code');
  } else {
    console.log('✓ Existing referral code found');
  }
  
  // 3. Fetch full referral stats (total refs, bonuses, etc.)
  await fetchReferralStats();
};
```

#### Loading States
- Shows "Generating your referral code..." while creating
- Smooth transition to full stats display

## Database Schema Linking

### Complete Data Flow: Wallet → Code → Referrals → Points

```
┌─────────────────────────────────────────────────────────────┐
│                    user_points TABLE                        │
│  (Created when code is generated)                          │
├─────────────────────────────────────────────────────────────┤
│  wallet_address (PK)    "0xABC...123"                      │
│  referral_code (UNIQUE)  "ABC123"         ← GENERATED      │
│  total_points            0                                  │
│  current_season_points   0                                  │
│  current_season_id       uuid-123                          │
│  active_referrals_count  0                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ When someone uses the code
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    referrals TABLE                          │
│  (Created when referee uses code)                          │
├─────────────────────────────────────────────────────────────┤
│  referrer_wallet  "0xABC...123"  ← Links to user_points   │
│  referee_wallet   "0xDEF...456"                            │
│  referee_code_used "ABC123"                                │
│  is_active        false          ← true after first trade  │
│  first_trade_at   null           ← timestamp of first trade│
│  total_trades_count 0                                       │
│  total_points_generated 0        ← accumulates over time   │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ When referee completes trades
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                 point_transactions TABLE                    │
│  (Points awarded to both trader and referrer)              │
├─────────────────────────────────────────────────────────────┤
│  wallet_address   "0xDEF...456"  ← Referee earns points   │
│  points_earned    105            ← Based on trade profit   │
│  transaction_type "TRADE"                                   │
│  source_position_id "pos-123"                              │
│  season_id        uuid-123                                  │
│─────────────────────────────────────────────────────────────│
│  wallet_address   "0xABC...123"  ← Referrer bonus points  │
│  points_earned    100            ← Flat bonus or multiplier│
│  transaction_type "REFERRAL_BONUS"                         │
│  metadata         {"referee": "0xDEF...456"}              │
│  season_id        uuid-123                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ Points accumulate back to
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    user_points TABLE                        │
│  (Updated with accumulated points)                         │
├─────────────────────────────────────────────────────────────┤
│  wallet_address "0xABC...123"                              │
│  total_points   100                                         │
│  current_season_points 100                                  │
│  active_referrals_count 1        ← Incremented            │
└─────────────────────────────────────────────────────────────┘
```

## Key Relationships

### 1. Wallet → Code (One-to-One)
- **Table**: `user_points`
- **Primary Key**: `wallet_address`
- **Unique Constraint**: `referral_code`
- **Guarantee**: Each wallet has exactly one code

### 2. Referrer → Referees (One-to-Many)
- **Table**: `referrals`
- **Relationship**: `referrer_wallet` (one) → multiple `referee_wallet` (many)
- **Tracking**: Each referral tracks which code was used
- **Activation**: Referee must complete first trade (`is_active = true`)

### 3. Wallet → Points (One-to-Many)
- **Table**: `point_transactions`
- **Relationship**: `wallet_address` → multiple transactions
- **Types**: TRADE, REFERRAL_BONUS, ADMIN_ADJUSTMENT
- **Audit Trail**: Complete history of all point changes

### 4. Season → Points (One-to-Many)
- **Table**: `point_transactions`
- **Relationship**: `season_id` → multiple transactions
- **Reset**: Season points reset when new season starts
- **Historical**: All points remain in transaction log

## Accuracy Guarantees

### 1. Unique Codes
- **Constraint**: `user_points.referral_code` is UNIQUE
- **Collision Detection**: Service checks before insertion
- **Race Condition**: Handled with try-catch on duplicate key error

### 2. Single Referral Per User
- **Constraint**: `referrals.referee_wallet` is UNIQUE
- **Validation**: `validateReferralCode()` checks existing referrals
- **Prevention**: Cannot use multiple referral codes

### 3. Point Accuracy
- **Atomic Operations**: Database functions (`increment_user_points`)
- **Transaction Log**: All changes recorded in `point_transactions`
- **Idempotent Processing**: `points_processed` flag prevents double-counting
- **Audit Trail**: Complete history for verification

### 4. Referral Bonus Accuracy
- **Tracking**: `referrals.total_points_generated` tracks referee contribution
- **Tiers**: Calculated from `active_referrals_count`
  - < 10: Flat 100 points per active referee
  - ≥ 10: 1.2x multiplier on referee points
  - ≥ 30: 1.5x multiplier on referee points
- **Active Only**: Bonuses only for referees who completed trades

## Social Sharing Integration

### How Shared Links Work

1. **User visits Referrals tab** → Code auto-generates if missing
2. **Code stored in database** → `user_points.referral_code`
3. **Share modal displays link** → `https://app.com/ref/ABC123`
4. **New user clicks link** → Lands on `/ref/[code]` page
5. **Code validated** → Checks code exists, not self-referral
6. **Referral created** → Record in `referrals` table with `is_active=false`
7. **First trade completed** → `is_active=true`, points awarded

### Share Buttons
- **Twitter**: Pre-filled tweet with referral link
- **Telegram**: Share message with link
- **Copy Link**: Direct copy to clipboard
- **Native Share**: Mobile share sheet

## Testing the System

### Test Scenario 1: New User Gets Code
```bash
# 1. Connect fresh wallet
# 2. Navigate to Referrals tab
# Expected: Code auto-generates, appears in UI
# Verify in DB:
SELECT referral_code FROM user_points WHERE wallet_address = 'YOUR_WALLET';
```

### Test Scenario 2: Share and Refer
```bash
# 1. User A shares referral link
# 2. User B clicks link, connects wallet
# 3. User B makes first trade
# Expected:
#   - Referral record created with is_active=true
#   - User B earns trade points
#   - User A earns referral bonus
# Verify in DB:
SELECT * FROM referrals WHERE referrer_wallet = 'USER_A';
SELECT * FROM point_transactions WHERE wallet_address IN ('USER_A', 'USER_B');
```

### Test Scenario 3: Existing User Returns
```bash
# 1. User connects wallet (has existing code)
# 2. Navigate to Referrals tab
# Expected: Same code displays, no new generation
# Verify: Check console logs show "✓ Existing referral code found"
```

## Error Handling

### Service Layer Errors
- **Code Generation Failure**: Returns `null`, UI shows error
- **Database Connection**: Try-catch logs error, graceful degradation
- **Collision Exhaustion**: After 10 attempts, returns `null`
- **Race Conditions**: Catches duplicate key error, fetches existing code

### Frontend Errors
- **Loading State**: Shows spinner + message
- **Failed Generation**: "Failed to load referral stats" message
- **Retry**: User can refresh page to retry

## Future Enhancements

### Potential Improvements
1. **Webhook Integration**: Real-time notifications on new referrals
2. **Custom Codes**: Allow users to claim custom vanity codes
3. **Referral Tiers**: Badge system (Bronze, Silver, Gold referrer)
4. **Analytics**: Track click-through rates, conversion rates
5. **Referral Competitions**: Time-limited bonus multipliers

## Summary

The automatic referral code generation system ensures:
- ✅ Every wallet gets a unique code immediately
- ✅ Codes are stored permanently in database
- ✅ Social sharing always uses the correct code
- ✅ Points track accurately through entire referral chain
- ✅ Database relationships maintain data integrity
- ✅ Idempotent operations prevent duplicates
- ✅ Complete audit trail for all point changes

**Key Takeaway**: The system automatically generates codes on wallet connection, stores them securely in the database linked to the wallet address, and ensures all referral bonuses and points are accurately tracked through the complete data flow.

