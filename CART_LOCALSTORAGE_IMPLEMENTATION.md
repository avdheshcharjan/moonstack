# Cart LocalStorage Implementation

## Overview

The cart data is now persisted to localStorage with wallet address separation. When the user reloads the page or reconnects their wallet, their cart items are automatically restored. Additionally, cart items can be updated with fresh order data when new orders are fetched.

## Key Features

### 1. **Wallet-Specific Storage**
- Cart data is stored separately for each wallet address
- Storage key format: `optionbook_cart_0x...` (wallet address in lowercase)
- When wallet disconnects, cart is cleared
- When wallet changes, previous wallet's cart is saved and new wallet's cart is loaded

### 2. **Automatic Persistence**
- Cart items are automatically saved to localStorage whenever they change
- Cart is automatically loaded when wallet connects
- Cart is cleared from localStorage when `clearCart()` is called

### 3. **BigInt Serialization**
- All BigInt values are converted to strings for JSON serialization
- Values are converted back to BigInt when loading from localStorage
- Maintains data integrity across page reloads

### 4. **Fresh Order Updates**
- New function `updateCartWithFreshOrders()` updates cart items with latest order data
- Matches items by `pairId` to find corresponding fresh orders
- Preserves user's bet size while updating order parameters, signatures, and prices
- Automatically recalculates contract amounts based on fresh prices

## Implementation Details

### LocalStorage Helper Functions

#### `saveCartToLocalStorage(walletAddress, items)`
- Serializes cart items (converting BigInt to string)
- Saves to localStorage with wallet-specific key
- Called automatically whenever items change

#### `loadCartFromLocalStorage(walletAddress)`
- Loads cart items from localStorage
- Deserializes items (converting string back to BigInt)
- Called automatically when wallet connects

#### `clearCartFromLocalStorage(walletAddress)`
- Removes cart data for specific wallet
- Called when cart is cleared

### Serialization Functions

#### `serializeCartItem(item)`
Converts a CartItem to a JSON-safe format:
- `BigInt` → `string`
- Preserves all other data types
- Maintains structure for easy deserialization

#### `deserializeCartItem(serialized)`
Converts serialized data back to CartItem:
- `string` → `BigInt`
- Restores exact cart item structure

### Update Fresh Orders Function

#### `updateCartWithFreshOrders(freshPairs)`
Updates cart items with latest order data:

**Process:**
1. For each cart item, find matching pair by `pairId`
2. Get fresh order based on action (yes = call, no = put)
3. Preserve user's bet size
4. Recalculate contracts based on fresh price
5. Update order parameters with fresh data
6. Rebuild transaction calldata with fresh signature
7. Update item in cart

**Benefits:**
- Prevents failed transactions due to stale orders
- Ensures users get latest prices
- Maintains user's intended bet size
- Updates signatures automatically

## Usage

### Basic Cart Operations

```typescript
import { useCart } from '@/src/contexts/CartContext';

function MyComponent() {
  const { items, addItem, removeItem, clearCart } = useCart();
  
  // Cart automatically saves to localStorage when items change
  // Cart automatically loads from localStorage on wallet connect
}
```

### Updating Cart with Fresh Orders

```typescript
import { useCart } from '@/src/contexts/CartContext';
import { useOrders } from '@/src/hooks/useOrders';

function MyComponent() {
  const { updateCartWithFreshOrders } = useCart();
  const { orders } = useOrders();
  
  // When fresh orders are fetched, update cart items
  useEffect(() => {
    if (orders && orders.length > 0) {
      const pairs = pairBinaryOptions(orders);
      updateCartWithFreshOrders(pairs);
    }
  }, [orders, updateCartWithFreshOrders]);
}
```

### CartProvider Setup

The CartProvider now automatically handles wallet address:

```tsx
// In layout.tsx
<BaseAccountProvider>
  <CartProvider>
    {children}
  </CartProvider>
</BaseAccountProvider>
```

The CartProvider uses `useWallet()` hook internally to access wallet address.

## Data Flow

1. **User connects wallet** → Cart loads from localStorage for that wallet
2. **User adds items** → Cart saves to localStorage automatically
3. **User reloads page** → Cart loads from localStorage when wallet reconnects
4. **Orders refresh** → Call `updateCartWithFreshOrders()` to update cart with fresh data
5. **User executes batch** → Cart clears and localStorage is cleared
6. **User disconnects wallet** → Cart state clears (localStorage preserved for reconnect)

## Storage Structure

### LocalStorage Key
```
optionbook_cart_0x1234567890abcdef... (wallet address)
```

### Stored Data Format
```json
[
  {
    "id": "1699123456789-abc123",
    "pairId": "BTC_100000_2024-12-31",
    "addedAt": 1699123456789,
    "metadata": {
      "marketName": "BTC above $100,000",
      "optionType": "CALL",
      "action": "yes",
      "strikePrice": "$100,000",
      "expiry": "1704067200",
      "expiryFormatted": "Dec 31, 2024, 4:00 PM",
      "usdcAmount": "10000000",
      "usdcAmountFormatted": "10.00",
      "numContracts": "20000000",
      "pricePerContract": "0.5000"
    },
    "payload": {
      "to": "0x...",
      "data": "0x...",
      "value": "0x0",
      "signature": "0x...",
      "referrer": "0x...",
      "orderParams": {
        "maker": "0x...",
        "orderExpiryTimestamp": "1704067200",
        "collateral": "0x...",
        "isCall": true,
        "priceFeed": "0x...",
        "implementation": "0x...",
        "isLong": true,
        "maxCollateralUsable": "100000000",
        "strikes": ["10000000000"],
        "expiry": "1704067200",
        "price": "50000000",
        "numContracts": "20000000",
        "extraOptionData": "0x"
      }
    }
  }
]
```

## Error Handling

- **LocalStorage unavailable**: Silently fails, cart works in-memory only
- **Corrupted data**: Catches errors and returns empty cart
- **Missing fresh orders**: Keeps existing cart items unchanged
- **Failed order update**: Logs warning, keeps original item

## Benefits

✅ **Persistence**: Cart survives page reloads and browser restarts
✅ **Wallet Separation**: Each wallet has its own cart
✅ **Fresh Data**: Cart items can be updated with latest order data
✅ **No Manual Sync**: Everything happens automatically
✅ **Type Safe**: Full TypeScript support with proper BigInt handling
✅ **Error Resilient**: Graceful degradation if localStorage fails

## Migration Notes

- Existing carts will be empty until items are added
- No data migration needed from previous implementation
- CartProvider signature unchanged (backward compatible)
- New `updateCartWithFreshOrders()` function is optional to use
