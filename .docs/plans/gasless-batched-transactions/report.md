---
title: Gasless Batched Transactions Implementation Report
date: 10/24/2025
original-plan: `.docs/plans/gasless-batched-transactions/parallel-plan.md`
---

# Overview

Successfully implemented gasless batched transactions using ERC-4337 smart accounts with Base Paymaster. Users now pre-approve USDC spending on first visit (adaptive 10→5→1 USDC based on balance), swipe through cards to add transactions to a wallet-specific cart, and execute all transactions in a single gasless batch with one swipe. The implementation includes automatic approval checking before cart execution and graceful error handling throughout.

## Files Changed

### Core Utilities
- **`/src/utils/cartStorage.ts`** - Updated to support wallet-specific cart storage, all methods now accept optional `walletAddress` parameter
- **`/src/utils/approvalTracking.ts`** - NEW: Created approval state tracking utility with adaptive approval logic (10→5→1 USDC) and localStorage persistence

### Services
- **`/src/services/batchExecution.ts`** - Replaced ethers.js with smart account + paymaster for gasless batch execution, properly handles approval call ordering and EOA vs smart account addresses

### UI Components
- **`/src/components/cart/ApprovalModal.tsx`** - NEW: Created approval modal with adaptive USDC approval, gasless execution via paymaster, and friendly error messages
- **`/src/components/cart/CartModal.tsx`** - Updated to execute ALL transactions on single swipe, shows batch summary card, auto-closes on success with BaseScan link toast, includes allowance checking before execution
- **`/src/components/market/SwipeView.tsx`** - Added approval check on first visit, blocks swiping until approval complete, shows loading states

## New Features

1. **Wallet-Specific Cart Storage** - Each connected wallet has its own cart stored in localStorage, preventing cross-wallet transaction confusion.

2. **Adaptive USDC Approval** - System automatically attempts to approve 10 USDC, falling back to 5 USDC, then 1 USDC based on user's balance, with friendly error if user has less than 1 USDC.

3. **First-Visit Approval Modal** - Users are prompted to approve USDC spending on first app visit, executed gaslessly via Base Paymaster with no gas fees.

4. **Batch-All Execution** - Single swipe right in cart modal executes ALL transactions in one gasless UserOperation, instead of executing one-at-a-time.

5. **Pre-Execution Allowance Check** - Cart modal automatically checks if total USDC needed exceeds current allowance and prompts for additional approval before execution.

6. **Gasless Transactions** - All USDC approvals and batch executions are sponsored by Base Paymaster, users pay no gas fees.

7. **Smart Account Integration** - Uses ERC-4337 EntryPoint v0.7 with simple smart accounts for batched operations and paymaster support.

8. **Success Toast with BaseScan Link** - After successful batch execution, green toast appears with clickable BaseScan link to view transaction on blockchain explorer.

9. **Auto-Close Cart on Success** - Cart modal automatically closes 2 seconds after successful execution and clears all transactions.

10. **Batch Summary Card** - Cart displays single summary card showing total transaction count and total USDC amount instead of navigating through individual cards.

## Additional Notes

### Critical Implementation Details

1. **EOA vs Smart Account Addresses** - The implementation correctly checks USDC balance on the EOA wallet (where user funds are held) but checks allowance for the smart account address (which needs approval to spend). This is critical for proper functionality.

2. **Call Ordering** - Approval calls are always added FIRST in the batch calls array, before any fillOrder calls, ensuring approval completes before trades execute.

3. **Type Casting Workarounds** - Uses `as any` casts for permissionless library's `sendUserOperation` and `waitForUserOperationReceipt` methods due to deep type instantiation issues in the library (documented workaround).

4. **Transaction Hash Retrieval** - Implementation correctly waits for UserOperation receipt and extracts the actual transaction hash (not UserOp hash) for BaseScan links.

5. **Next.js Build Validation** - All code compiles successfully in Next.js build (`npx next build` passes). Some TypeScript errors appear in node_modules (wagmi library issues) but these don't affect functionality.

### Not Yet Implemented

1. **Paymaster Fallback to User-Paid Gas** - Current implementation catches paymaster errors but does not offer user-paid gas fallback. If paymaster fails, transaction simply fails with error message. Future enhancement needed to detect AA31 errors and prompt user to pay gas themselves.

2. **Cart Size Limits** - No enforced limit on cart size. Recommend adding MAX_CART_SIZE = 20 to prevent gas limit issues with very large batches.

### Environment Configuration Required

Ensure these environment variables are set:
- `NEXT_PUBLIC_BUNDLER_URL` - Coinbase bundler endpoint
- `NEXT_PUBLIC_PAYMASTER_URL` - Coinbase paymaster endpoint (can be same as bundler)
- `CDP_PROJECT_ID` - Coinbase Developer Platform project ID
- `CDP_API_KEY` - CDP API key

Paymaster gas policy allowlist must include:
- OptionBook: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## E2E Tests To Perform

### Test 1: First-Time User Approval Flow
1. Connect wallet that has never used the app (or clear localStorage)
2. Ensure wallet has at least 10 USDC on Base mainnet
3. Navigate to Play page
4. **Expected:** Approval modal appears immediately
5. **Expected:** Modal shows "You're about to approve 10 USDC for playing Moonstack"
6. Click "Approve" button
7. **Expected:** Wallet popup appears (should be gasless - no gas fee shown)
8. Confirm transaction in wallet
9. **Expected:** Success toast appears, modal closes, cards become available for swiping
10. **Expected:** No errors in console

### Test 2: Adaptive Approval with Low Balance
1. Use wallet with only 3 USDC balance
2. Clear localStorage and reload app
3. **Expected:** Approval modal shows "You're about to approve 5 USDC" (not 10)
4. Complete approval
5. **Expected:** Success

### Test 3: Insufficient Balance Error
1. Use wallet with less than 1 USDC balance
2. Clear localStorage and reload app
3. **Expected:** Approval modal shows error message: "You need at least 1 USDC to play. Please add funds to your wallet."
4. **Expected:** Approve button is disabled

### Test 4: Adding Transactions to Cart
1. After approval, swipe right on YES card
2. **Expected:** Toast appears "Added to cart"
3. **Expected:** Cart badge in top bar shows "1"
4. Swipe left on NO card
5. **Expected:** Toast appears "Added to cart"
6. **Expected:** Cart badge shows "2"
7. Swipe up to skip card
8. **Expected:** No cart update
9. Add 3-5 more transactions
10. **Expected:** Cart badge updates with each addition

### Test 5: Batch Execution - Happy Path
1. After adding multiple transactions to cart, click cart icon
2. **Expected:** Cart modal opens showing batch summary card
3. **Expected:** Card displays "BATCH" badge, total transaction count, and total USDC amount
4. **Expected:** Instructions say "Swipe right to execute ALL or left to discard ALL"
5. Swipe right on card
6. **Expected:** Loading overlay appears: "Executing batch..."
7. **Expected:** Wallet popup appears (should be gasless)
8. Confirm transaction in wallet
9. **Expected:** Green toast appears with "Executed Successfully" and BaseScan link
10. Click BaseScan link
11. **Expected:** Opens basescan.org with transaction details
12. **Expected:** Cart modal closes after 2 seconds
13. **Expected:** Cart badge disappears
14. **Expected:** Console logs show successful batch execution

### Test 6: Discard All Transactions
1. Add several transactions to cart
2. Open cart modal
3. Swipe left on batch card
4. **Expected:** Cart modal closes immediately
5. **Expected:** Cart badge disappears
6. **Expected:** All transactions removed from cart

### Test 7: Wallet-Specific Cart Switching
1. Add 2-3 transactions to cart with Wallet A
2. Disconnect wallet
3. Connect different Wallet B
4. **Expected:** Cart badge shows 0 (empty cart for Wallet B)
5. Add 1 transaction with Wallet B
6. **Expected:** Cart badge shows 1
7. Disconnect and reconnect Wallet A
8. **Expected:** Cart badge shows 2-3 (original Wallet A transactions restored)

### Test 8: Allowance Check Before Execution
1. Complete initial approval (10 USDC)
2. Add enough transactions to cart to exceed 10 USDC total
3. Open cart modal
4. **Expected:** Approval modal appears automatically
5. **Expected:** Message indicates need for additional approval
6. Complete approval
7. **Expected:** Cart modal shows batch card (can now execute)

### Test 9: Empty Cart Behavior
1. Ensure cart is empty
2. Click cart icon
3. **Expected:** Cart modal shows "Cart is empty" message
4. **Expected:** No swipeable card displayed
5. Close modal
6. **Expected:** No errors

### Test 10: Processing State Management
1. Add transactions to cart
2. Open cart modal and swipe right to execute
3. While wallet popup is open, verify:
   - **Expected:** Loading overlay is visible
   - **Expected:** "Executing batch..." message shown
   - **Expected:** Swipe card is disabled
   - **Expected:** Close button is disabled
4. Reject transaction in wallet
5. **Expected:** Error toast appears
6. **Expected:** Processing overlay disappears
7. **Expected:** Cart remains intact (can retry)

### Test 11: Approval State Persistence
1. Complete approval and use app normally
2. Close browser completely
3. Reopen browser and connect same wallet
4. **Expected:** No approval modal appears (state persisted)
5. **Expected:** Can immediately swipe cards

### Test 12: Console Error Monitoring
1. Throughout all tests, monitor browser console
2. **Expected:** No uncaught errors or type errors
3. **Expected:** Informative logs for debugging (balance checks, allowance checks, execution steps)
4. **Expected:** No "undefined" or "null" reference errors
