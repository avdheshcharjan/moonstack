# Batch Execution Debugging Guide

## Current Setup

### Base Account SDK Configuration
- **SDK**: `@base-org/account` (passkey-based smart wallet)
- **Chain ID**: 8453 (Base mainnet)
- **Gas Sponsorship**: Disabled (users pay their own gas fees with ETH)
- **Batch Method**: `wallet_sendCalls` (EIP-5792)

### Key Files
1. **`src/services/batchExecution.ts`**: Main batch execution logic
2. **`src/services/cartService.ts`**: Adds bets to cart with validation
3. **`src/components/cart/CartModal.tsx`**: UI for cart and batch execution trigger
4. **`src/hooks/useWallet.ts`**: Base Account SDK connection management

## Common Issues and Solutions

### Issue 1: "execution reverted" / "Order expired"

**Symptoms:**
- Error: `failed to estimate gas for user operation: useroperation reverted: execution reverted`
- Error: `useroperation reverted: Order expired`

**Root Causes:**
1. Orders in cart have expired (orderExpiryTimestamp < current time)
2. Cart transactions are too old (>5 minutes)
3. Market data is stale

**Solutions:**
1. **Clear the cart** - Remove all old transactions
2. **Refresh the page** - Get fresh market data with new orderExpiryTimestamp
3. **Add fresh bets** - Swipe to add new bets to cart
4. **Execute quickly** - Submit batch within 5 minutes of adding to cart

**Validation Added:**
- `cartService.ts:44-51` - Checks order expiry when adding to cart
- `batchExecution.ts:24-51` - Validates cart transactions before execution

### Issue 2: Gas Fees (ETH Balance)

**Important:** With paymaster disabled, users must have ETH in their wallet to pay for gas fees.

**Check:**
- Ensure the connected Base Account has enough ETH for gas (~0.001-0.01 ETH)
- USDC is still needed for the actual bets
- ETH is only for transaction fees

**If insufficient ETH:**
- Bridge ETH to Base network
- Or re-enable paymaster in `batchExecution.ts` (see git history)

### Issue 3: Address Mismatch

**Symptoms:**
- Different address in localStorage vs Base Account
- Balance shows 0 USDC even though wallet has funds

**Solutions:**
- Code now auto-detects and uses the correct address from SDK
- See `batchExecution.ts:109-125`

## Debugging Checklist

When you encounter "execution reverted" error:

1. **Check Browser Console Logs:**
   - Look for `[cartService]` logs when adding to cart
   - Look for `[batchExecution]` logs when executing
   - Check for "Time until expiry" - should be >60 seconds

2. **Validate Cart Contents:**
   - Open cart modal
   - Check transaction timestamps
   - If any are >5 minutes old, clear cart

3. **Check Order Expiry:**
   - Console should show: `[cartService] Time until expiry: XXX seconds`
   - If <60 seconds, refresh page immediately

4. **Verify Wallet State:**
   - Console should show: `[batchExecution] User USDC balance: XX USDC`
   - If 0, check if using correct address
   - **Important:** Also check ETH balance for gas fees (need ~0.001-0.01 ETH)

5. **Check Gas Settings:**
   - Console should show: `[batchExecution] usingPaymaster: false`
   - This means users pay their own gas with ETH

## Enhanced Logging

New detailed logs added to help debug:

### In `cartService.ts`:
```
[cartService] Current time: 1234567890
[cartService] Order expiry: 1234567950
[cartService] Time until expiry: 60 seconds
[cartService] Warning: Order expires in less than 60 seconds!
```

### In `batchExecution.ts`:
```
[batchExecution] Cart validation passed
[batchExecution] User USDC balance: 10.001104 USDC
[batchExecution] Current USDC allowance: 0.2 USDC
[batchExecution] Call 1: {
  to: '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1',
  value: '0x0',
  dataLength: 1234,
  description: 'YES - BTC - $0.1',
  requiredUSDC: 0.1
}
[batchExecution] wallet_sendCalls params: {
  version: '2.0.0',
  from: '0x...',
  callsCount: 2,
  chainId: '0x2105',
  atomicRequired: true,
  hasPaymaster: true
}
```

## Recommended Testing Flow

1. **Clear localStorage and refresh:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Connect wallet:**
   - Click "Connect Wallet"
   - Authenticate via Base Account (passkey)

3. **Add fresh bets:**
   - Swipe RIGHT (UP bet) or LEFT (DOWN bet)
   - Check console for "Time until expiry"
   - Should see: `Added [UP/DOWN] bet to cart!`

4. **Execute quickly:**
   - Open cart (should show transactions)
   - Swipe RIGHT to execute ALL
   - Should trigger batch execution

5. **Monitor logs:**
   - Watch for detailed execution logs
   - Look for any validation errors
   - Check final transaction hash

## Next Steps if Still Failing

If "execution reverted" persists after following above steps:

1. **Check order data structure:**
   - The encoded transaction data might be malformed
   - Verify `fillOrder` parameters match contract ABI

2. **Test single transaction:**
   - Try executing with just 1 item in cart
   - Isolate if issue is with batching or individual tx

3. **Verify contract addresses:**
   - OPTION_BOOK_ADDRESS: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
   - USDC_ADDRESS: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

4. **Check Base Account SDK version:**
   ```bash
   npm list @base-org/account
   ```

5. **Verify ETH balance for gas:**
   - Check wallet has enough ETH (~0.001-0.01 ETH)
   - Without paymaster, users must pay gas fees themselves

## Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `Order expired` | orderExpiryTimestamp < now | Refresh page, add fresh bets |
| `execution reverted` | Transaction simulation failed | Check order expiry, balance, allowance |
| `Transaction rejected by user` | User clicked "Reject" | User needs to approve transaction |
| `Insufficient USDC balance` | Not enough USDC | Add USDC to wallet |
| `transaction(s) in cart are too old` | Cart items >5 min old | Clear cart, add fresh bets |

