# Batch Transaction Cart Implementation

This document describes the batch transaction cart system implemented for the Optionbook demo.

## Overview

The system allows users to:
1. Add transactions to a cart instead of executing them immediately
2. View all pending transactions in a cart modal
3. Select specific transactions to execute or discard
4. Execute multiple transactions in a single batch with automatic USDC approval

## Architecture

### 1. Type Definitions (`src/types/cart.ts`)

```typescript
export interface CartTransaction {
  id: string;
  to: Address;
  data: Hex;
  value?: bigint;
  description: string;
  timestamp: number;
  requiredUSDC?: bigint;
  orderDetails?: {
    marketId: string;
    side: 'YES' | 'NO';
    amount: string;
  };
}

export interface CartState {
  transactions: CartTransaction[];
  lastUpdated: number;
}
```

### 2. Cart Storage Utility (`src/utils/cartStorage.ts`)

Manages localStorage operations with the following methods:

- `getTransactions()` - Retrieve all cart transactions
- `addTransaction(transaction)` - Add a new transaction
- `removeTransactions(ids)` - Remove specific transactions
- `clearCart()` - Clear all transactions
- `getTotalUSDC()` - Calculate total USDC needed
- `getCount()` - Get transaction count

**Key Features:**
- Handles bigint serialization/deserialization
- Dispatches `cartUpdated` event on all modifications
- Client-side only operation with proper error handling

### 3. Modified Direct Execution (`src/services/directExecution.ts`)

**Changes:**
- Removed immediate transaction execution
- Now saves transaction data to cart using `cartStorage.addTransaction()`
- Returns `addedToCart: true` instead of `txHash`

**What gets saved:**
- Transaction ID (generated)
- Target address (OPTION_BOOK_ADDRESS)
- Encoded fillOrder data
- Required USDC amount
- Order details (market, side, amount)
- Human-readable description

### 4. Batch Execution Service (`src/services/batchExecution.ts`)

Implements batch transaction execution using Base Account SDK:

```typescript
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult>
```

**Process:**
1. Calculate total USDC needed from all transactions
2. Check user's USDC balance
3. Check USDC allowance for OPTION_BOOK_ADDRESS
4. Approve USDC if needed (using ethers.js)
5. Prepare batch calls array
6. Execute batch using `wallet_sendCalls` (Base Account SDK)

**Key Features:**
- Uses `atomicRequired: true` - all transactions succeed or all fail
- Handles USDC approval automatically
- Comprehensive error handling and logging

### 5. Cart UI Component (`src/components/cart/CartModal.tsx`)

Modal interface with:

**Features:**
- List of all pending transactions
- Checkboxes for individual transaction selection
- "Select All" functionality
- Total USDC calculation for selected transactions
- "Approve & Execute" button - executes selected transactions
- "Discard Selected" button - removes selected from cart
- Real-time cart updates

**UX Details:**
- Auto-selects all transactions by default
- Shows loading state during execution
- Displays transaction details (description, amount, timestamp)
- Color-coded YES/NO badges
- Empty state when cart is empty

### 6. Updated TopBar (`src/components/layout/TopBar.tsx`)

**Changes:**
- Added cart icon button with badge showing transaction count
- Integrated CartModal component
- Event listeners for real-time cart updates
- Badge only shows when cart has items

## User Flow

### Adding to Cart

1. User swipes a card (YES or NO)
2. `executeDirectFillOrder()` is called
3. Transaction data is encoded
4. Transaction is saved to localStorage
5. Cart badge updates automatically
6. User sees cart count increment

### Executing Batch

1. User clicks cart icon in navbar
2. Cart modal opens showing all transactions
3. User selects transactions to execute (or uses "Select All")
4. User clicks "Approve & Execute"
5. System checks USDC balance
6. System approves USDC if needed (single approval for total amount)
7. System sends batch transaction via Base Account SDK
8. On success: executed transactions removed from cart
9. Cart modal closes if all transactions were executed

### Discarding Transactions

1. User opens cart modal
2. User selects transactions to discard
3. User clicks "Discard Selected"
4. Confirmation dialog appears
5. Selected transactions removed from cart
6. Cart updates automatically

## Technical Details

### USDC Approval Strategy

The system approves the **exact total amount** needed for all selected transactions:

```typescript
const totalUSDC = transactions.reduce((sum, tx) =>
  sum + (tx.requiredUSDC || 0n), 0n
);

if (currentAllowance < totalUSDC) {
  await usdcContract.approve(OPTION_BOOK_ADDRESS, totalUSDC);
}
```

### Batch Transaction Format

Using Base Account SDK's `wallet_sendCalls`:

```typescript
{
  version: '2.0.0',
  from: userAddress,
  chainId: numberToHex(base.constants.CHAIN_IDS.base),
  atomicRequired: true,
  calls: [
    { to: OPTION_BOOK_ADDRESS, value: '0x0', data: fillOrderData1 },
    { to: OPTION_BOOK_ADDRESS, value: '0x0', data: fillOrderData2 },
    // ... more transactions
  ]
}
```

### Real-time Updates

Cart updates are synchronized across components using:
- `storage` event (cross-tab updates)
- `cartUpdated` custom event (same-window updates)

Both TopBar and CartModal listen to these events to update their state.

## Error Handling

- **Insufficient Balance:** Clear error message with required vs. available USDC
- **Approval Failed:** Transaction halts, user is notified
- **Batch Execution Failed:** All transactions remain in cart, error displayed
- **Storage Errors:** Logged to console, errors thrown to caller

## Files Modified/Created

### Created:
- `src/types/cart.ts`
- `src/utils/cartStorage.ts`
- `src/components/cart/CartModal.tsx`

### Modified:
- `src/services/directExecution.ts`
- `src/services/batchExecution.ts`
- `src/components/layout/TopBar.tsx`

## Future Enhancements

Potential improvements:
- Transaction status tracking (pending, confirming, confirmed)
- Retry failed transactions
- Edit transaction amounts before execution
- Save carts across sessions
- Transaction history
- Gas estimation display
- Reorder transactions via drag & drop
