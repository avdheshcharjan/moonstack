# Debug Wallet Connection Issue

## Problem
User clicks "Approve All" but gets "Please sign in with Base first" even though they signed in.

## Root Cause
The old `localStorage` value from previous implementation is confusing things, but the actual React state is null.

## What I Fixed

### 1. Clear Old localStorage on App Load
```typescript
// This runs once when the app mounts
useEffect(() => {
  localStorage.removeItem('moonstack_wallet_address');
  localStorage.removeItem('moonstack_chain_id');
  console.log('🧹 Cleaned up old localStorage values');
}, []);
```

### 2. Added Debug Logging
Now when you sign in, you'll see:
```
🔵 Requesting "Sign in with Base"...
📝 Accounts returned: ["0x..."]
✅ Connected with Base Account: 0x...
✅ Setting wallet state: { address: "0x...", chainId: 8453 }
🔍 Wallet state after connection: { walletAddress: "0x..." }
```

And when you click "Approve All":
```
🔍 Cart approval check: { 
  address: "0x...", 
  walletAddress: "0x...", 
  hasAddress: true 
}
```

## How to Test

### Step 1: Clear Everything
```javascript
// Run in console:
localStorage.clear();
location.reload();
```

### Step 2: Sign In Fresh
1. Click "Sign in with Base"
2. Complete authentication
3. Watch console for:
   ```
   🧹 Cleaned up old localStorage values
   🔵 Requesting "Sign in with Base"...
   ✅ Connected with Base Account: 0xYourAddress
   🔍 Moonstack wallet state: { walletAddress: "0xYourAddress" }
   ```

### Step 3: Try Cart
1. Swipe right on cards
2. Open cart
3. Click "Approve All"
4. Should see:
   ```
   🔍 Cart approval check: { address: "0x...", walletAddress: "0x...", hasAddress: true }
   ```

## If Still Not Working

### Check Console
Run these in console:
```javascript
// Should be empty now
localStorage.getItem('moonstack_wallet_address')

// Check React state (won't work directly, but you'll see it in logs)
// Look for: "🔍 Moonstack wallet state: { walletAddress: ... }"
```

### Force Re-render
If state seems stuck:
1. Refresh page (⌘+R)
2. Sign in again
3. Try cart again

## Expected Behavior

### On Page Load
- Old localStorage cleared automatically
- No wallet connected
- See "Sign in with Base" button

### After Signing In (Same Session)
- walletAddress state is set
- Can swipe and add to cart
- Can approve cart transactions
- NO need to sign in again until page reload

### After Page Reload
- State is cleared
- Must sign in again
- This is intentional per your requirements

## Debug Commands

```javascript
// Check if localStorage is clear
Object.keys(localStorage).filter(k => k.includes('moonstack'))
// Should return: []

// Check what the Moonstack component sees (look in console logs)
// Search for: "🔍 Moonstack wallet state"
```

