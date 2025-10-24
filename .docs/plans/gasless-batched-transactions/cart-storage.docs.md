# Cart Storage System Documentation

## Overview

This document details the cart storage system and transaction management in the OptionBook demo application. The cart system allows users to queue transactions for later execution, with support for batch processing and wallet-specific storage.

## Core Architecture

### Storage Layer: localStorage-based persistence
- **Key**: `optionbook_cart` (single key for all transactions)
- **Format**: JSON serialized with custom revivers for BigInt handling
- **Location**: `/src/utils/cartStorage.ts`

### Type Definitions
Location: `/src/types/cart.ts`

```typescript
export interface CartTransaction {
  id: string;                    // Unique identifier: `${timestamp}-${random}`
  to: Address;                   // Contract address (OptionBook)
  data: Hex;                     // Encoded function call data
  value?: bigint;                // Native token value (optional)
  description: string;           // Human-readable description
  timestamp: number;             // Creation timestamp (Date.now())
  requiredUSDC?: bigint;         // Required USDC amount (6 decimals)
  orderDetails?: {
    marketId: string;            // Market identifier (e.g., "BTC")
    side: 'YES' | 'NO';         // Order side
    amount: string;              // Bet amount as string
  };
}

export interface CartState {
  transactions: CartTransaction[];
  lastUpdated: number;
}
```

## Cart Storage API

### File: `/src/utils/cartStorage.ts`

#### Core Methods

**1. getTransactions(): CartTransaction[]**
```typescript
// Returns all transactions from cart
// - Server-safe: returns [] if window is undefined
// - Handles BigInt deserialization automatically
const transactions = cartStorage.getTransactions();
```

**2. addTransaction(transaction: CartTransaction): void**
```typescript
// Adds a transaction to cart
// - Throws error on server-side
// - Auto-serializes BigInt values
// - Dispatches 'cartUpdated' event
cartStorage.addTransaction({
  id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
  to: OPTION_BOOK_ADDRESS,
  data: encodedCallData,
  description: 'YES - BTC - $5',
  timestamp: Date.now(),
  requiredUSDC: 5_000_000n, // 5 USDC in 6 decimals
  orderDetails: {
    marketId: 'BTC',
    side: 'YES',
    amount: '5'
  }
});
```

**3. removeTransactions(ids: string[]): void**
```typescript
// Removes multiple transactions by ID
// - Throws error on server-side
// - Dispatches 'cartUpdated' event
cartStorage.removeTransactions(['tx-id-1', 'tx-id-2']);
```

**4. clearCart(): void**
```typescript
// Removes all transactions
// - Throws error on server-side
// - Dispatches 'cartUpdated' event
cartStorage.clearCart();
```

**5. getTotalUSDC(): bigint**
```typescript
// Calculates total USDC needed
// - Sums all requiredUSDC fields
// - Returns 0n if no transactions
const totalUSDC = cartStorage.getTotalUSDC();
const totalDollars = Number(totalUSDC) / 1_000_000;
```

**6. getCount(): number**
```typescript
// Returns number of transactions in cart
const count = cartStorage.getCount();
```

### BigInt Serialization

The cart storage handles BigInt values automatically:

```typescript
// Serialization (writing to localStorage)
JSON.stringify(state, (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
});

// Deserialization (reading from localStorage)
JSON.parse(stored, (key, value) => {
  if (key === 'value' || key === 'requiredUSDC') {
    return value ? BigInt(value) : undefined;
  }
  return value;
});
```

## Adding Items to Cart

### Primary Entry Point: Direct Execution Service
File: `/src/services/directExecution.ts`

**Function: executeDirectFillOrder()**
```typescript
export async function executeDirectFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<DirectExecutionResult>
```

**Process:**
1. Validates wallet connection
2. Calculates numContracts from betSize and order price
3. Checks USDC balance
4. Checks and approves USDC allowance if needed
5. Encodes fillOrder transaction data
6. **Creates CartTransaction and adds to cart**
7. Returns success with `addedToCart: true`

**Code Snippet:**
```typescript
// Step 5: Encode the fillOrder call
const fillOrderData = encodeFunctionData({
  abi: OPTION_BOOK_ABI,
  functionName: 'fillOrder',
  args: [orderParams, signature, REFERRER_ADDRESS],
});

// Add transaction to cart instead of executing immediately
const cartTransaction: CartTransaction = {
  id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
  to: OPTION_BOOK_ADDRESS as Address,
  data: fillOrderData,
  description: `${action.toUpperCase()} - ${pair.underlying} - $${betSize}`,
  timestamp: Date.now(),
  requiredUSDC: requiredAmount,
  orderDetails: {
    marketId: pair.id || pair.underlying,
    side: action.toUpperCase() as 'YES' | 'NO',
    amount: betSize.toString(),
  },
};

cartStorage.addTransaction(cartTransaction);
```

### User Flow: Swiping on Markets
File: `/src/components/market/SwipeView.tsx`

When user swipes on a market card:
1. `handleSwipe()` is called with pair and action
2. Imports and calls `executeDirectFillOrder()`
3. Transaction is added to cart
4. Toast notification shows success

```typescript
const handleSwipe = useCallback(async (pair: BinaryPair, action: 'yes' | 'no') => {
  const { executeDirectFillOrder } = await import('@/src/services/directExecution');
  const result = await executeDirectFillOrder(pair, action, betSize, walletAddress as Address);

  if (result.success) {
    addToast('Successfully added to cart!', 'success');
  }
}, [walletAddress, betSize, addToast]);
```

## Cart UI Components

### 1. Cart Modal
File: `/src/components/cart/CartModal.tsx`

**Props:**
```typescript
interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}
```

**Features:**
- Full-screen modal overlay (z-index: 100)
- Displays transactions one at a time (card stack pattern)
- Swipe right to approve/execute
- Swipe left to discard
- Shows transaction count (current/total)
- Displays USDC amount, market, and side
- Processing state with spinner overlay

**Key State:**
```typescript
const [transactions, setTransactions] = useState<CartTransaction[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [isProcessing, setIsProcessing] = useState(false);
const { address } = useAccount(); // Wagmi hook
```

**Transaction Display:**
```typescript
const currentTx = transactions[currentIndex];

// Shows:
// - Side badge (YES/NO with color)
// - Market name
// - Description
// - Amount in USDC (formatted from bigint)
// - Timestamp
```

**Event Handling:**

**Swipe Right (Approve):**
```typescript
const handleSwipeRight = () => {
  setIsProcessing(true);

  (async () => {
    const result = await executeBatchTransactions([currentTx], address);

    if (result.success) {
      cartStorage.removeTransactions([currentTx.id]);
      onCartUpdate?.();
      alert('Transaction approved and executed successfully!');
    }
  })();
};
```

**Swipe Left (Discard):**
```typescript
const handleSwipeLeft = () => {
  cartStorage.removeTransactions([currentTx.id]);
  onCartUpdate?.();
  onClose();
};
```

**USDC Formatting:**
```typescript
const formatUSDC = (amount: bigint) => {
  return (Number(amount) / 1_000_000).toFixed(2);
};
```

### 2. Swipeable Card Component
File: `/src/components/cart/CartSwipeableCard.tsx`

**Props:**
```typescript
interface CartSwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeComplete: () => void;
  disabled: boolean;
}
```

**Features:**
- Framer Motion-powered swipe gestures
- Visual feedback overlays (APPROVE/DISCARD)
- Rotation and opacity effects
- Threshold-based swipe detection
- Velocity-based quick swipes

**Thresholds:**
```typescript
const HORIZONTAL_SWIPE_THRESHOLD = 120; // pixels to trigger action
const VISUAL_FEEDBACK_THRESHOLD = 15;   // pixels to show overlay
```

**Motion Values:**
```typescript
const x = useMotionValue(0);
const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
const opacity = useTransform(x, (latest) => {
  const absX = Math.abs(latest);
  return absX > 200 ? 0 : 1;
});
```

**Swipe Detection:**
```typescript
const handleDragEnd = (event, info: PanInfo) => {
  const offsetX = info.offset.x;
  const velocityX = info.velocity.x;

  if (offsetX > THRESHOLD || velocityX > 500) {
    setExitX(1000);
    onSwipeRight();
  } else if (offsetX < -THRESHOLD || velocityX < -500) {
    setExitX(-1000);
    onSwipeLeft();
  }
};
```

**Overlays:**
- **APPROVE** (Green): Shows on right swipe
  - Background: rgba(34, 197, 94, 1)
  - Text: "APPROVE" rotated 12deg
  - Opacity scales with swipe distance

- **DISCARD** (Red): Shows on left swipe
  - Background: rgba(239, 68, 68, 1)
  - Text: "DISCARD" rotated -12deg
  - Opacity scales with swipe distance

### 3. Top Bar Integration
File: `/src/components/layout/TopBar.tsx`

**Features:**
- Cart icon with badge counter
- Opens CartModal on click
- Listens for cart updates

**State Management:**
```typescript
const [isCartOpen, setIsCartOpen] = useState(false);
const [cartCount, setCartCount] = useState(0);
```

**Event Listeners:**
```typescript
useEffect(() => {
  updateCartCount();

  // Listen for storage changes (cross-tab)
  window.addEventListener('storage', handleStorageChange);

  // Listen for same-window updates
  window.addEventListener('cartUpdated', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('cartUpdated', handleStorageChange);
  };
}, []);

const updateCartCount = () => {
  setCartCount(cartStorage.getCount());
};
```

**Cart Badge:**
```typescript
{cartCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
    {cartCount}
  </span>
)}
```

## Cart Event System

### Event Dispatching
The cart storage dispatches a custom `cartUpdated` event whenever the cart changes:

```typescript
window.dispatchEvent(new Event('cartUpdated'));
```

**Triggered by:**
- `addTransaction()`
- `removeTransactions()`
- `clearCart()`

### Event Listeners
Components listen for cart updates:

```typescript
// Same-window updates
window.addEventListener('cartUpdated', handleStorageChange);

// Cross-tab updates
window.addEventListener('storage', handleStorageChange);
```

**Use cases:**
- Update cart badge counter in TopBar
- Refresh cart list in CartModal
- Sync UI state across components

## Batch Execution

### File: `/src/services/batchExecution.ts`

**Function: executeBatchTransactions()**
```typescript
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult>
```

**Process:**
1. Validates wallet connection
2. Creates ethers provider and signer
3. Calculates total USDC needed
4. Checks USDC balance
5. Checks and approves USDC allowance
6. Attempts batch execution via EIP-5792 (`wallet_sendCalls`)
7. Falls back to sequential execution if batch not supported
8. Returns success with transaction hash

**USDC Approval:**
```typescript
const totalUSDC = transactions.reduce((sum, tx) =>
  sum + (tx.requiredUSDC || 0n), 0n
);

const balance = await usdcContract.balanceOf(userAddress);
if (balance < totalUSDC) {
  throw new Error('Insufficient USDC balance');
}

const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);
if (currentAllowance < totalUSDC) {
  const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, totalUSDC);
  await approveTx.wait();
}
```

**Batch Execution (EIP-5792):**
```typescript
const calls = transactions.map((tx) => ({
  to: tx.to,
  value: tx.value ? numberToHex(tx.value) : '0x0',
  data: tx.data,
}));

const result = await provider.send('wallet_sendCalls', [{
  version: '1.0',
  from: userAddress,
  calls: calls,
}]);
```

**Fallback (Sequential):**
```typescript
for (let i = 0; i < transactions.length; i++) {
  const tx = transactions[i];
  const txResponse = await signer.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: tx.value || 0n,
  });
  await txResponse.wait();
}
```

## Wallet-Specific Storage

### Current Implementation
Currently, the cart storage is **NOT wallet-specific**. All transactions are stored under a single key: `optionbook_cart`.

### Implications
- All wallets share the same cart
- Switching wallets does NOT clear or change cart contents
- Transactions from one wallet may appear for another wallet

### Recommended Enhancement
To implement wallet-specific storage:

```typescript
// Modified storage key
const CART_STORAGE_KEY = (address?: Address) =>
  address ? `optionbook_cart_${address.toLowerCase()}` : 'optionbook_cart';

// Modified methods
getTransactions(walletAddress?: Address): CartTransaction[] {
  const key = CART_STORAGE_KEY(walletAddress);
  const stored = localStorage.getItem(key);
  // ... rest of implementation
}

addTransaction(transaction: CartTransaction, walletAddress: Address): void {
  const key = CART_STORAGE_KEY(walletAddress);
  // ... rest of implementation
}
```

## Data Flow Summary

### Adding to Cart
```
User swipes on market card
  ↓
SwipeView.handleSwipe()
  ↓
executeDirectFillOrder()
  ↓
Validates balance/allowance
  ↓
Encodes transaction data
  ↓
cartStorage.addTransaction()
  ↓
Saves to localStorage
  ↓
Dispatches 'cartUpdated' event
  ↓
TopBar updates badge counter
```

### Executing from Cart
```
User clicks cart icon
  ↓
CartModal opens
  ↓
Loads transactions from storage
  ↓
User swipes right on transaction
  ↓
CartModal.handleSwipeRight()
  ↓
executeBatchTransactions([transaction])
  ↓
Checks/approves USDC
  ↓
Attempts batch execution (EIP-5792)
  ↓
Falls back to sequential if needed
  ↓
Removes transaction on success
  ↓
Dispatches 'cartUpdated' event
  ↓
Updates UI
```

## Key Files Reference

### Core Files
- `/src/types/cart.ts` - Type definitions
- `/src/utils/cartStorage.ts` - Storage API
- `/src/services/directExecution.ts` - Adding to cart
- `/src/services/batchExecution.ts` - Executing transactions

### UI Components
- `/src/components/cart/CartModal.tsx` - Main cart modal
- `/src/components/cart/CartSwipeableCard.tsx` - Swipeable card component
- `/src/components/layout/TopBar.tsx` - Cart icon and badge
- `/src/components/market/SwipeView.tsx` - Market swipe interface

### Hooks
- `/src/hooks/useBatchTransactions.ts` - Legacy batch hook (deprecated)
- Wagmi hooks: `useAccount`, `useWalletClient`

## Testing Considerations

### Key Test Scenarios
1. **localStorage serialization**
   - BigInt values are properly serialized/deserialized
   - Empty cart returns empty array
   - Invalid JSON is handled gracefully

2. **Event dispatching**
   - 'cartUpdated' event fires on add/remove/clear
   - Multiple listeners receive events
   - Event handlers update UI correctly

3. **USDC calculations**
   - getTotalUSDC() sums all transactions
   - Handles undefined requiredUSDC fields
   - Returns 0n for empty cart

4. **Swipe gestures**
   - Threshold detection works correctly
   - Visual feedback appears at right time
   - Disabled state prevents interaction

5. **Batch execution**
   - EIP-5792 batch is attempted first
   - Fallback to sequential works
   - USDC approval is checked
   - Transactions are removed on success

## Current Limitations

1. **No wallet-specific storage** - All wallets share same cart
2. **No persistence guarantees** - localStorage can be cleared
3. **No transaction expiry** - Old transactions never auto-remove
4. **No cart size limit** - Unbounded growth possible
5. **No transaction validation** - Invalid transactions can be added
6. **No error recovery** - Failed transactions not automatically retried
7. **No transaction ordering** - FIFO order only
8. **No batch size limits** - Could exceed gas limits

## Future Enhancements

1. **Wallet-specific carts** - Separate storage per wallet address
2. **Transaction expiry** - Auto-remove old transactions
3. **Cart size limits** - Maximum number of transactions
4. **Transaction validation** - Check validity before adding
5. **Error recovery** - Retry failed transactions
6. **Custom ordering** - Reorder transactions in cart
7. **Batch optimization** - Split large batches automatically
8. **Persistent storage** - Database backup of cart state
9. **Cross-device sync** - Sync cart across devices
10. **Transaction estimation** - Show gas estimates before execution
