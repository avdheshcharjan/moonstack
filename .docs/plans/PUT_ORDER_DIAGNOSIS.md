# PUT Order Batch Transaction Diagnosis

## Problem Summary

Batch transactions work smoothly for CALL orders but fail for PUT orders with an arithmetic underflow/overflow error (0x11).

## Error Details

```
EstimateGasExecutionError: Execution reverted with reason: panic: arithmetic underflow or overflow (0x11).
```

**This error occurs during gas estimation, which means the transaction itself would fail even with unlimited gas.**

## Changes Implemented

### 1. Gas Padding Configuration (src/services/BatchExecutor.ts, src/services/directExecution.ts)

Added configurable gas padding with higher multipliers for PUT orders:

```typescript
const GAS_CONFIG = {
  CALL_GAS_PADDING: 1.3,  // 30% extra gas for CALL orders
  PUT_GAS_PADDING: 1.5,   // 50% extra gas for PUT orders
  PRE_VERIFICATION_PADDING: 1.4,  // 40% extra for preVerification
};
```

Can be configured via environment variables:
- `NEXT_PUBLIC_CALL_GAS_PADDING=1.3`
- `NEXT_PUBLIC_PUT_GAS_PADDING=1.5`
- `NEXT_PUBLIC_PRE_VERIFICATION_PADDING=1.4`

### 2. Order Validation (src/services/BatchExecutor.ts:135-169)

Added pre-execution validation:
- ✅ Check order expiry timestamps
- ✅ Check option expiry timestamps
- ✅ Validate numContracts > 0
- ✅ Validate strikes array exists

### 3. Enhanced Error Logging (src/services/BatchExecutor.ts:376-401)

Added detailed diagnostics when gas estimation fails:
- Market name
- Option type (CALL/PUT)
- Action (yes/no)
- USDC amount
- Strike price
- Expiry
- Number of contracts
- **CRITICAL flag for arithmetic errors**

### 4. Non-Blocking Gas Estimation

Gas estimation failures no longer block execution - the paymaster will determine actual gas needs.

## Root Cause Analysis

The arithmetic underflow/overflow error (0x11) indicates a **contract-level issue**, not a gas issue. This means:

### Confirmed Findings:

✅ **CALL orders work perfectly** - Gas estimation succeeds, transactions execute
❌ **PUT orders fail consistently** - Arithmetic underflow during gas estimation

### Example from Real Logs:

**Failed PUT Order:**
```
Market: Will BTC be above $110,000 by Oct 31, 2025?
Type: PUT (isCall: false)
Action: no
Price per contract: 630.6673 USDC
Number of contracts: 1585 (scaled: 0.001585 actual)
USDC amount: $1.00
Error: arithmetic underflow or overflow (0x11)
```

**Successful CALL Order:**
```
Market: Will SOL be above $192 by Oct 31, 2025?
Type: CALL (isCall: true)
Action: yes
Gas estimate: 635,515 → 826,170 (with 1.3x padding)
Status: ✅ SUCCESS
```

### Possible Root Causes:

1. **Smart Contract Bug in PUT Option Logic**
   - The OptionBook contract may have incorrect arithmetic for PUT options
   - Subtraction operations that work for CALL may underflow for PUT
   - Collateral calculations may not account for PUT option mechanics

2. **Order Parameter Issues**
   - `isLong` flag may be set incorrectly for PUT options from the API
   - Price scaling may differ between CALL and PUT options
   - Strike values may cause underflow when processed by the contract

3. **API Data Corruption**
   - PUT option orders from the API may have malformed parameters
   - Signatures may be valid but parameters incompatible with contract logic

4. **Price/Strike Relationship**
   - PUT options with very high prices (>$600) relative to strikes
   - Contract may attempt: `strike - something` which underflows if value > strike

## Debugging Steps

### Step 1: Check Console Logs

Look for the CRITICAL warning:
```
⚠️  CRITICAL: Order has arithmetic underflow/overflow - transaction will likely FAIL
```

This will show you which specific order is problematic.

### Step 2: Validate Order Data

Check the logged order details:
- Is the expiry in the future?
- Is numContracts positive and reasonable?
- Are strikes valid?
- Is the price reasonable?

### Step 3: Compare CALL vs PUT Orders

Log successful CALL order data and compare with failing PUT order data:
```typescript
console.log('CALL order params:', callOrderParams);
console.log('PUT order params:', putOrderParams);
```

Look for differences in:
- `isCall` flag
- `isLong` flag
- Strike values
- Price values

### Step 4: Test Direct Execution

Try executing a single PUT order (not in batch) to see if the issue persists:
- Use the "Buy Now" button instead of cart
- Check if single PUT orders work

### Step 5: Simulate Transaction

Use Tenderly to simulate the transaction:
1. Go to https://dashboard.tenderly.co/
2. Paste the EntryPoint contract: `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`
3. Use `simulateHandleOp` function
4. Paste your UserOperation data
5. View the detailed trace to see where the underflow occurs

## Recommendations

### Immediate Actions:

1. **Remove expired orders from cart** - Add auto-cleanup for expired orders
2. **Add min/max validation** - Validate numContracts has reasonable bounds
3. **Test with small amounts** - Try PUT orders with very small bet sizes (e.g., $1)

### Investigation:

1. **Check order source** - Verify PUT option data from the API is valid
2. **Review numContracts calculation** - May need different logic for PUT vs CALL
3. **Contact OptionBook team** - Report the arithmetic error with sample order data

## Environment Configuration

Add to your `.env` file to tune gas padding:

```bash
# Increase PUT order gas padding if needed
NEXT_PUBLIC_PUT_GAS_PADDING=1.7  # Try higher values: 1.7, 2.0, etc.
NEXT_PUBLIC_CALL_GAS_PADDING=1.3
NEXT_PUBLIC_PRE_VERIFICATION_PADDING=1.4
```

## Conclusion

While gas padding has been increased for PUT orders, **the root issue is not gas-related**. The arithmetic underflow error indicates a problem with the order data or smart contract logic that needs investigation.

The enhanced logging will help identify which specific orders are problematic so you can debug the root cause.
