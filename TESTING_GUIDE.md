# Testing Guide for Batch Paymaster Fix

## 🎯 Objective

Verify that:
1. **Both transactions execute** (2 USDC spent, not 1)
2. **Gas is sponsored** by paymaster (ETH balance unchanged)
3. **Atomic execution** (all succeed or all fail together)
4. **Single signature** required for the batch

## 📋 Pre-Test Setup

### 1. Environment Configuration
Ensure `.env.local` exists with:
```bash
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
NEXT_PUBLIC_URL=http://localhost:3000
```

### 2. Coinbase Developer Platform
- [ ] Paymaster enabled
- [ ] OptionBook contract allowlisted: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- [ ] USDC contract allowlisted: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] Spending limits configured

### 3. Wallet Setup
- [ ] Base Account installed/accessible
- [ ] Some USDC in wallet (at least 5 USDC for testing)
- [ ] Don't need ETH (gas will be sponsored!)

## 🧪 Test Cases

### Test 1: Single Transaction (Baseline)

**Purpose**: Verify single transactions work with paymaster

**Steps**:
1. Start app: `npm run dev`
2. Connect Base Account wallet
3. Swipe right on ONE prediction card (1 USDC)
4. Open cart (should show "1" transaction)
5. Click "Approve All (1)"
6. Check Base Account popup

**Expected Results**:
- ✅ Base Account shows asset change: `-1.000000 USDC`
- ✅ ETH balance unchanged
- ✅ Console shows "Single transaction via smart account"
- ✅ Transaction succeeds
- ✅ Cart clears

**Console Should Show**:
```
🚀 GASLESS BATCH EXECUTION STARTING
📦 Total transactions: 1
📤 Sending single transaction via smart account...
✅ BATCH EXECUTION SUCCESSFUL!
⚡ Gas fees sponsored by Paymaster
```

---

### Test 2: Batch Transaction (2 Transactions) ⭐ PRIMARY TEST

**Purpose**: Verify atomic batch execution with gas sponsorship

**Steps**:
1. Refresh the page
2. Swipe right on FIRST prediction card (1 USDC)
3. Swipe right on SECOND prediction card (1 USDC)
4. Open cart (should show "2" transactions)
5. Verify total shows "2.00 USDC"
6. Note your current ETH balance
7. Note your current USDC balance
8. Click "Approve All (2)"
9. Watch console output carefully
10. Check Base Account popup

**Expected Results**:
- ✅ Base Account shows asset change: `-2.000000 USDC` (NOT -1!)
- ✅ ETH balance UNCHANGED (0.000000 ETH spent on gas)
- ✅ USDC balance decreased by exactly 2 USDC
- ✅ Console shows "Encoding batch of 2 transactions"
- ✅ Console shows "All 2 transactions executed atomically"
- ✅ Single signature required
- ✅ Cart clears automatically
- ✅ Success message appears

**Console Should Show**:
```
========================================
🚀 GASLESS BATCH EXECUTION STARTING
========================================
👤 User Address: 0x...
📦 Total transactions: 2
💰 Total USDC needed: 2000000

🔧 Creating Smart Account with Paymaster...
✅ Base Account provider found
✅ Simple Smart Account created
🏦 Smart Account Address: 0x...

📝 Preparing call 1/2:
  To: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  Description: Approve USDC
  
📝 Preparing call 2/2:
  To: 0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
  Description: Fill order

========================================
📡 Sending Batch Transaction to Bundler...
⚡ Paymaster will sponsor gas fees
🔗 All transactions will execute atomically
========================================

📦 Encoding batch of 2 transactions...
📤 Sending batched UserOperation...
✅ Batch transaction submitted and mined!

========================================
✅ BATCH EXECUTION SUCCESSFUL!
========================================
🔗 Transaction Hash: 0x...
📦 All 2 transactions executed atomically
⚡ Gas fees sponsored by Paymaster
🎉 User only paid USDC, no ETH required!
========================================
```

---

### Test 3: Batch Transaction (3+ Transactions)

**Purpose**: Verify batching scales beyond 2 transactions

**Steps**:
1. Refresh the page
2. Swipe right on 3-5 prediction cards
3. Open cart
4. Verify total USDC amount
5. Click "Approve All"

**Expected Results**:
- ✅ All transactions execute
- ✅ Total USDC amount matches sum of all transactions
- ✅ Gas still sponsored
- ✅ Console shows "Encoding batch of X transactions"

---

### Test 4: Error Handling - Insufficient USDC

**Purpose**: Verify graceful error handling

**Steps**:
1. Add 2 transactions totaling more USDC than you have
2. Click "Approve All"

**Expected Results**:
- ✅ Error message appears
- ✅ Console shows detailed error
- ✅ Transactions don't partially execute
- ✅ Cart remains intact

---

### Test 5: Paymaster Not Configured

**Purpose**: Verify error handling when paymaster is missing

**Steps**:
1. Temporarily remove `NEXT_PUBLIC_PAYMASTER_URL` from `.env.local`
2. Restart dev server
3. Try to execute batch

**Expected Results**:
- ✅ Console shows warning: "NEXT_PUBLIC_PAYMASTER_URL not configured"
- ✅ Error message: "Base Paymaster not configured"
- ✅ Transactions don't execute

---

## 🔍 Key Things to Verify

### In Base Account Popup
- [ ] Shows asset changes for ALL transactions
- [ ] USDC amount matches total (e.g., -2.000000 for 2x 1 USDC)
- [ ] Gas fee shows as "Sponsored" or 0 ETH

### In Browser Console
- [ ] "Creating Smart Account with Paymaster" appears
- [ ] "Smart Account Address" is logged
- [ ] "Encoding batch of X transactions" appears (for X > 1)
- [ ] "Paymaster will sponsor gas fees" appears
- [ ] "All X transactions executed atomically" appears
- [ ] Transaction hash is displayed
- [ ] No error messages

### In Wallet
- [ ] USDC balance decreased by total amount
- [ ] ETH balance UNCHANGED (or only changed by non-gas transactions)

### On Basescan
1. Copy transaction hash from console
2. Go to https://basescan.org
3. Paste transaction hash

Verify:
- [ ] Transaction succeeded
- [ ] "Method" shows batch execution
- [ ] Multiple internal transactions visible
- [ ] Gas paid by smart account (not user's wallet)

## ❌ Signs of Problems

### Problem: Only 1 transaction executes
**Symptoms**:
- Base Account shows -1 USDC instead of -2 USDC
- Console shows "Transaction 1/2" and "Transaction 2/2" sequentially
- Two separate transaction hashes

**Diagnosis**: Old code is still running
**Fix**: Clear browser cache, restart dev server, hard refresh (Cmd+Shift+R)

### Problem: Gas not sponsored
**Symptoms**:
- ETH balance decreased
- Base Account shows gas fee amount
- Console doesn't show "Paymaster will sponsor gas fees"

**Diagnosis**: Paymaster not configured or contracts not allowlisted
**Fix**: 
- Verify `.env.local` has correct URL
- Check CDP dashboard that paymaster is enabled
- Verify contracts are allowlisted

### Problem: Smart Account not created
**Symptoms**:
- Error: "Smart account can only be created on client side"
- Console doesn't show "Smart Account Address"

**Diagnosis**: Base Account provider issue
**Fix**:
- Disconnect and reconnect wallet
- Refresh page
- Check that Base Account (not MetaMask) is connected

## 📊 Success Criteria

All of these must be true for test to pass:

- [x] ✅ 2 transactions added to cart
- [x] ✅ Base Account shows -2.000000 USDC (not -1!)
- [x] ✅ ETH balance unchanged (gas sponsored)
- [x] ✅ Console shows "Encoding batch of 2 transactions"
- [x] ✅ Console shows "Smart Account Address"
- [x] ✅ Console shows "Paymaster will sponsor gas fees"
- [x] ✅ Console shows "All 2 transactions executed atomically"
- [x] ✅ Single signature required
- [x] ✅ Cart clears after success
- [x] ✅ Success message with tx hash
- [x] ✅ Transaction visible on Basescan

## 🎯 Quick Test Script

1. Start app: `npm run dev`
2. Connect Base Account
3. Swipe 2 cards (1 USDC each)
4. Open cart → verify "2.00 USDC"
5. Click "Approve All (2)"
6. Check Base Account → should show -2 USDC
7. Check console → should show "batch of 2 transactions"
8. Verify ETH unchanged
9. ✅ TEST PASSED if all above succeed!

## 📝 Reporting Issues

If tests fail, collect:
1. Full console output (copy/paste)
2. Screenshot of Base Account popup
3. Network tab from browser DevTools
4. Environment configuration (without API key!)
5. Transaction hash (if any)

## 🚀 Next Steps After Testing

Once tests pass:
- [ ] Test with different transaction amounts
- [ ] Test with different cryptocurrencies
- [ ] Monitor paymaster usage in CDP dashboard
- [ ] Set up production environment variables
- [ ] Deploy to production

---

**Happy Testing!** 🎉

