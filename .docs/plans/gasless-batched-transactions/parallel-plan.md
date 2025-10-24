# Gasless Batched Transactions - Parallel Implementation Plan

## Overview

This plan implements a gasless, batched transaction system that allows users to:
1. Pre-authorize USDC spending (adaptive 10→5→1 USDC approval) on first visit
2. Swipe through prediction cards and add transactions to cart (no immediate execution)
3. Review all pending transactions in cart modal
4. Execute ALL transactions in a single gasless batch via Base Paymaster
5. Fallback to user-paid gas if paymaster unavailable

**Key Architecture Changes:**
- Cart storage becomes wallet-specific (currently global)
- Cart modal executes ALL transactions on single swipe (currently one-at-a-time)
- Batch execution uses smart account + paymaster (currently uses ethers.js)
- New approval modal for first-time and low-allowance scenarios

**Critical Files to Review:**
- `/src/services/immediateExecution.ts` - Working smart account + paymaster reference
- `/src/lib/smartAccount.ts` - Smart account creation utilities
- `/src/utils/usdcApproval.ts` - USDC approval utilities
- `/src/utils/cartStorage.ts` - Cart storage (needs wallet-specific updates)
- `/src/services/batchExecution.ts` - Batch execution (needs smart account integration)
- `/src/components/cart/CartModal.tsx` - Cart UI (needs batch-all behavior)

**Documentation:**
- `.docs/plans/gasless-batched-transactions/shared.md` - Comprehensive feature documentation
- `.docs/plans/gasless-batched-transactions/requirements.md` - User flows and requirements
- `.docs/plans/gasless-batched-transactions/smart-account-paymaster.docs.md` - ERC-4337 details
- `.docs/plans/gasless-batched-transactions/usdc-approval.docs.md` - Approval patterns
- `.docs/plans/gasless-batched-transactions/cart-storage.docs.md` - Cart API details
- `.docs/plans/gasless-batched-transactions/ui-patterns.docs.md` - Modal/toast patterns

---

## Implementation Tasks

### Stage 1: Foundation - Storage & Utilities

These tasks are independent and can be executed in parallel. They establish the foundation for wallet-specific state and approval tracking.

---

#### Task 1.1: Make Cart Storage Wallet-Specific [Dependencies: none] {backend-developer}

**Purpose:** Update cart storage to be wallet-specific so each connected wallet has its own cart.

**Current State:** Cart uses single global key `optionbook_cart`

**Target State:** Cart uses wallet-scoped key `optionbook_cart_${walletAddress}`

**Changes Required:**
1. Update `cartStorage` methods to accept optional `walletAddress` parameter
2. Modify storage key generation to include wallet address
3. Add wallet change detection to clear cart when wallet switches
4. Update all method signatures while maintaining backward compatibility

**Files to Modify:**
- `/src/utils/cartStorage.ts` - Core storage API

**Gotchas:**
- Must handle `walletAddress` being `null` or `undefined` gracefully
- BigInt serialization must continue working (already implemented)
- `cartUpdated` event should still fire for cart updates
- Consider migration path for existing non-wallet-specific carts

**Reference:**
- See `shared.md` lines 205-212 for wallet-specific storage pattern
- See `shared.md` lines 683-693 for technical decision rationale

**Success Criteria:**
- `cartStorage.getTransactions(walletAddress)` returns wallet-specific transactions
- Switching wallets loads correct cart
- Type checking passes with no errors

---

#### Task 1.2: Create Approval State Tracking Utility [Dependencies: none] {backend-developer}

**Purpose:** Create utility to track USDC approval state per wallet in localStorage.

**Current State:** No approval tracking exists

**Target State:** New utility tracks approval amounts and timestamps per wallet

**Functions to Implement:**
```typescript
// Check if initial approval needed (first visit or allowance < 1 USDC)
function needsInitialApproval(walletAddress: Address, smartAccountAddress: Address): Promise<boolean>

// Store approval state after successful approval
function storeApprovalState(walletAddress: Address, amount: bigint): void

// Get stored approval state
function getApprovalState(walletAddress: Address): { amount: bigint; timestamp: number } | null

// Check if approval refresh needed (allowance < 1 USDC)
function needsApprovalRefresh(walletAddress: Address, smartAccountAddress: Address): Promise<boolean>

// Adaptive approval logic: try 10 → 5 → 1 USDC based on balance
function getAdaptiveApprovalAmount(walletAddress: Address): Promise<bigint>
```

**Files to Create:**
- `/src/utils/approvalTracking.ts` - New utility file

**Files to Read:**
- `/src/utils/usdcApproval.ts` - Existing approval utilities
- `/src/lib/smartAccount.ts` - Smart account address utilities

**Gotchas:**
- Must check balance on EOA wallet (owner), not smart account
- Must check allowance for smart account, not EOA wallet
- Storage key should be wallet-specific: `usdc_approval_${walletAddress}`
- Handle case where user has < 1 USDC (should throw error with friendly message)

**Reference:**
- See `shared.md` lines 276-304 for adaptive approval pattern
- See `shared.md` lines 532-548 for function requirements
- See `shared.md` lines 878-890 for smart account vs EOA gotcha

**Success Criteria:**
- All functions implemented and exported
- Adaptive logic tries 10 → 5 → 1 USDC correctly
- Type checking passes with no errors

---

### Stage 2: UI Components

These tasks create the user-facing approval modal and update existing UI components. They depend on Stage 1 utilities.

---

#### Task 2.1: Create Approval Modal Component [Dependencies: 1.2] {frontend-ui-developer}

**Purpose:** Create modal that prompts users to approve USDC spending on first visit or when allowance is low.

**Current State:** No approval modal exists

**Target State:** New modal component with adaptive approval logic

**Features:**
1. Friendly message: "You're about to approve [X] USDC for playing Moonstack"
2. Approve/Cancel buttons
3. Loading state during approval transaction
4. Success/error feedback
5. Adaptive approval (10 → 5 → 1 USDC based on balance)
6. Error state for insufficient balance (< 1 USDC)

**Files to Create:**
- `/src/components/cart/ApprovalModal.tsx` - New modal component

**Files to Read:**
- `/src/components/market/SwipeInstructionsModal.tsx` - Modal pattern reference
- `/src/utils/approvalTracking.ts` - Approval state utilities (from Task 1.2)
- `/src/lib/smartAccount.ts` - Smart account utilities
- `/src/hooks/useToastManager.ts` - Toast notifications
- `.docs/plans/gasless-batched-transactions/ui-patterns.docs.md` - Modal patterns

**Component Props:**
```typescript
interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalComplete: () => void;
  walletAddress: Address;
}
```

**Gotchas:**
- Must use smart account + paymaster for gasless approval
- Show loading overlay during transaction (but don't block wallet popup with z-index)
- Store approval state in localStorage after success
- Handle paymaster failure gracefully (offer user-paid gas option)
- Use Framer Motion for animations (see ui-patterns.docs.md)
- Lock body scroll when modal open

**Reference:**
- See `shared.md` lines 455-467 for requirements
- See `shared.md` lines 365-398 for modal animation pattern
- See `smart-account-paymaster.docs.md` for paymaster integration

**Success Criteria:**
- Modal appears with correct message and amount
- Approval executes gaslessly via paymaster
- State saved to localStorage on success
- Error handling for all edge cases
- Type checking passes with no errors

---

#### Task 2.2: Update Cart Modal for Batch-All Execution [Dependencies: 1.1] {frontend-ui-developer}

**Purpose:** Modify CartModal to execute ALL transactions on single swipe (not one-at-a-time).

**Current State:**
- Swipe right executes current transaction only
- User must swipe through each transaction individually

**Target State:**
- Swipe right executes ALL transactions in batch
- Swipe left discards ALL transactions
- Shows total USDC needed at bottom
- Auto-closes modal after successful execution
- Green toast with BaseScan link on success

**Changes Required:**
1. Update `handleSwipeRight` to call `executeBatchTransactions(transactions)` with ALL transactions
2. Update `handleSwipeLeft` to discard ALL transactions
3. Add total USDC display at bottom of modal
4. Remove card navigation (no need to swipe through each one)
5. Show single card with batch summary instead of individual cards
6. Update processing overlay message: "Executing batch..."
7. Close modal after 2 seconds on success
8. Show green toast with BaseScan link

**Files to Modify:**
- `/src/components/cart/CartModal.tsx` - Main cart UI

**Files to Read:**
- `/src/services/batchExecution.ts` - Batch execution service
- `/src/hooks/useToastManager.ts` - Toast notifications
- `/src/utils/cartStorage.ts` - Cart API (updated in Task 1.1)
- `.docs/plans/gasless-batched-transactions/ui-patterns.docs.md` - Toast patterns

**Gotchas:**
- Must check if total USDC > allowance before execution (trigger approval modal if needed)
- Processing overlay should NOT block wallet popup (manage z-index carefully)
- Cart should clear only on successful execution
- Must handle wallet-specific cart storage
- Show BaseScan link: `https://basescan.org/tx/${txHash}`

**Reference:**
- See `shared.md` lines 480-527 for detailed requirements
- See `shared.md` lines 699-710 for single-swipe decision rationale
- See `shared.md` lines 404-422 for toast notification pattern

**Success Criteria:**
- Single swipe right executes ALL transactions
- Single swipe left discards ALL transactions
- Success toast shows with BaseScan link
- Modal auto-closes after success
- Type checking passes with no errors

---

### Stage 3: Core Execution Logic

These tasks update the execution services to use smart accounts and paymaster. They depend on Stage 1 utilities and Stage 2 UI components.

---

#### Task 3.1: Update Batch Execution Service [Dependencies: 1.1, 1.2] {backend-developer}

**Purpose:** Replace ethers.js-based execution with smart account + paymaster for gasless batching.

**Current State:**
- Uses `ethers.js` BrowserProvider
- Separate approval transaction
- Tries EIP-5792 `wallet_sendCalls`, falls back to sequential
- User pays gas

**Target State:**
- Uses `createSmartAccountWithPaymaster` from `smartAccount.ts`
- Batched approval + fillOrder in single UserOperation
- Gasless via paymaster
- Fallback to user-paid gas if paymaster fails

**Changes Required:**
1. Remove ethers.js dependencies
2. Create smart account client using `createSmartAccountWithPaymaster`
3. Build calls array:
   - Check if approval needed using `needsApproval`
   - Add approval call if needed (must be first in array)
   - Add all `fillOrder` calls from CartTransactions
4. Execute via `smartAccountClient.sendUserOperation({ calls })`
5. Wait for receipt to get transaction hash
6. Handle paymaster failure: catch AA31 error, prompt user for user-paid gas
7. If user confirms, fall back to ethers.js execution (keep existing code as fallback)

**Files to Modify:**
- `/src/services/batchExecution.ts` - Core batch execution

**Files to Read:**
- `/src/services/immediateExecution.ts` - Smart account reference implementation
- `/src/lib/smartAccount.ts` - Smart account utilities
- `/src/utils/usdcApproval.ts` - Approval utilities
- `/src/utils/contracts.ts` - Contract addresses and ABIs
- `.docs/plans/gasless-batched-transactions/smart-account-paymaster.docs.md` - Paymaster details

**Gotchas:**
- Approval call MUST come before fillOrder calls in calls array
- Must cast to `as any` to avoid permissionless type errors
- `sendUserOperation` returns UserOp hash, not tx hash - must wait for receipt
- Check balance on EOA wallet, check allowance for smart account
- Smart account address is deterministic (can calculate before deployment)
- Handle paymaster errors gracefully (AA31 = paymaster rejection)

**Reference:**
- See `shared.md` lines 509-527 for implementation details
- See `shared.md` lines 252-270 for ERC-4337 flow
- See `shared.md` lines 276-289 for approval pattern
- See `shared.md` lines 920-935 for call order gotcha
- See `immediateExecution.ts` for working implementation

**Success Criteria:**
- Batch execution uses smart account + paymaster
- All transactions execute gaslessly
- Fallback to user-paid gas works
- Returns transaction hash for BaseScan link
- Type checking passes with no errors

---

### Stage 4: Integration Points

These tasks integrate the approval modal and updated cart behavior into the main app flow. They depend on all previous stages.

---

#### Task 4.1: Integrate Approval Modal into SwipeView [Dependencies: 1.2, 2.1] {frontend-ui-developer}

**Purpose:** Show approval modal on first visit (or when allowance exhausted) before allowing swipes.

**Current State:** No approval check before swiping

**Target State:**
- Check approval on mount
- Show approval modal if needed
- Block swiping until approval complete
- Re-check on wallet change

**Changes Required:**
1. Add state for approval modal visibility
2. Add state for approval completion status
3. Check `needsInitialApproval` on mount and wallet change
4. Show `ApprovalModal` if approval needed
5. Block swiping until `approvalComplete` is true
6. Show loading state while checking approval

**Files to Modify:**
- `/src/components/market/SwipeView.tsx` - Main swipe interface

**Files to Read:**
- `/src/components/cart/ApprovalModal.tsx` - Approval modal (from Task 2.1)
- `/src/utils/approvalTracking.ts` - Approval utilities (from Task 1.2)
- `/src/hooks/useWallet.ts` - Wallet connection
- `/src/lib/smartAccount.ts` - Smart account utilities

**Implementation Pattern:**
```typescript
const [showApprovalModal, setShowApprovalModal] = useState(false);
const [approvalComplete, setApprovalComplete] = useState(false);
const [isCheckingApproval, setIsCheckingApproval] = useState(true);

useEffect(() => {
  if (walletAddress) {
    checkNeedsApproval();
  }
}, [walletAddress]);

const checkNeedsApproval = async () => {
  const smartAccountAddress = await getSmartAccountAddress(walletAddress);
  const needed = await needsInitialApproval(walletAddress, smartAccountAddress);
  if (needed) {
    setShowApprovalModal(true);
  } else {
    setApprovalComplete(true);
  }
  setIsCheckingApproval(false);
};
```

**Gotchas:**
- Must get smart account address from `getSmartAccountAddress` utility
- Check approval for smart account, not EOA wallet
- Re-check approval when wallet changes
- Show loading state while checking (don't show cards yet)

**Reference:**
- See `shared.md` lines 553-585 for integration pattern
- See `requirements.md` lines 24-44 for first-time user flow

**Success Criteria:**
- Approval modal shows on first visit
- Swiping blocked until approval complete
- Re-checks on wallet change
- Loading state shown during checks
- Type checking passes with no errors

---

#### Task 4.2: Add Approval Check to Cart Modal [Dependencies: 1.2, 2.1, 2.2] {frontend-ui-developer}

**Purpose:** Check allowance when opening cart and prompt for additional approval if needed.

**Current State:** No allowance check when opening cart

**Target State:**
- Calculate total USDC needed when cart opens
- Check current allowance
- Show approval modal if total > allowance
- Block execution until sufficient allowance

**Changes Required:**
1. Add approval check in `useEffect` when modal opens
2. Calculate total USDC from all cart transactions
3. Get current allowance for smart account
4. If total > allowance, show `ApprovalModal`
5. Block swipe execution until allowance sufficient
6. Show loading state while checking

**Files to Modify:**
- `/src/components/cart/CartModal.tsx` - Cart modal (already modified in Task 2.2)

**Files to Read:**
- `/src/components/cart/ApprovalModal.tsx` - Approval modal (from Task 2.1)
- `/src/utils/approvalTracking.ts` - Approval utilities (from Task 1.2)
- `/src/utils/usdcApproval.ts` - Check allowance utilities
- `/src/lib/smartAccount.ts` - Smart account utilities

**Implementation Pattern:**
```typescript
const [showApprovalModal, setShowApprovalModal] = useState(false);
const [isCheckingAllowance, setIsCheckingAllowance] = useState(true);

useEffect(() => {
  if (isOpen && address) {
    checkAllowance();
  }
}, [isOpen, address]);

const checkAllowance = async () => {
  const totalNeeded = cartStorage.getTotalUSDC(address);
  const smartAccountAddress = await getSmartAccountAddress(address);
  const currentAllowance = await checkUSDCAllowance(smartAccountAddress);

  if (totalNeeded > currentAllowance) {
    setShowApprovalModal(true);
  }
  setIsCheckingAllowance(false);
};
```

**Gotchas:**
- Must use wallet-specific cart storage (from Task 1.1)
- Check allowance for smart account, not EOA wallet
- Show loading overlay while checking
- Don't allow execution while checking or if insufficient allowance

**Reference:**
- See `shared.md` lines 480-494 for cart approval check requirements
- See `requirements.md` lines 66-95 for cart review flow
- See `requirements.md` lines 153-170 for cart exceeds allowance edge case

**Success Criteria:**
- Allowance checked when cart opens
- Approval modal shows if insufficient
- Execution blocked until sufficient allowance
- Loading state during check
- Type checking passes with no errors

---

### Stage 5: Final Integration & Validation

This final task validates the entire implementation and runs type checking across all modified files.

---

#### Task 5.1: Type Validation & Integration Testing [Dependencies: 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2] {backend-developer}

**Purpose:** Validate all TypeScript types and ensure no compilation errors.

**Tasks:**
1. Run `npx tsc --noEmit` to check all types
2. Fix any type errors that appear
3. Ensure all imports resolve correctly
4. Verify no `any` types were introduced (except for permissionless workarounds)
5. Check that all contract addresses and ABIs are correctly typed

**Files to Validate:**
- `/src/utils/cartStorage.ts`
- `/src/utils/approvalTracking.ts`
- `/src/components/cart/ApprovalModal.tsx`
- `/src/components/cart/CartModal.tsx`
- `/src/services/batchExecution.ts`
- `/src/components/market/SwipeView.tsx`

**Gotchas:**
- Permissionless library requires `as any` casts in some places (this is acceptable)
- Viem v2 has some type issues with `authorizationList` (use `@ts-expect-error` comments)
- BigInt serialization must work correctly
- Address types must be `Address` from viem, not string

**Reference:**
- See CLAUDE.md for "NEVER use `any` type" instruction
- See `shared.md` lines 936-952 for type casting gotchas

**Success Criteria:**
- `npx tsc --noEmit` passes with no errors
- No new `any` types (except documented workarounds)
- All imports resolve
- All function signatures match expected types

---

## Dependency Graph

```
Stage 1 (Foundation):
├─ Task 1.1: Cart Storage Wallet-Specific [Independent]
└─ Task 1.2: Approval Tracking Utility [Independent]

Stage 2 (UI Components):
├─ Task 2.1: Approval Modal → depends on [1.2]
└─ Task 2.2: Cart Modal Batch-All → depends on [1.1]

Stage 3 (Execution):
└─ Task 3.1: Batch Execution Service → depends on [1.1, 1.2]

Stage 4 (Integration):
├─ Task 4.1: SwipeView Integration → depends on [1.2, 2.1]
└─ Task 4.2: Cart Modal Allowance Check → depends on [1.2, 2.1, 2.2]

Stage 5 (Validation):
└─ Task 5.1: Type Validation → depends on [ALL]
```

## Execution Order

**Batch 1 (Parallel):** Tasks 1.1, 1.2
**Batch 2 (Parallel):** Tasks 2.1, 2.2, 3.1
**Batch 3 (Parallel):** Tasks 4.1, 4.2
**Batch 4 (Sequential):** Task 5.1

---

## Key Technical Decisions

1. **Wallet-Specific Cart:** Prevents cross-wallet confusion, better UX
2. **Single Swipe for All:** Reduces friction, aligns with batching concept
3. **Gasless by Default:** Always try paymaster first, fallback to user-paid only on error
4. **Adaptive Approval:** 10 → 5 → 1 USDC based on balance
5. **Auto-Refresh Approval:** Prompt when allowance < 1 USDC

See `shared.md` lines 679-762 for detailed decision rationale.

---

## Testing Checklist

After implementation, manually verify:
- [ ] Approval modal shows on first visit
- [ ] Adaptive approval tries 10→5→1 based on balance
- [ ] Approval executes gaslessly
- [ ] Swipes add to cart (wallet-specific)
- [ ] Cart badge updates
- [ ] Cart shows all transactions
- [ ] Single swipe right executes ALL
- [ ] Single swipe left discards ALL
- [ ] Success toast with BaseScan link
- [ ] Cart clears after success
- [ ] Wallet change loads correct cart
- [ ] Re-approval prompts when needed
- [ ] Paymaster fallback works

See `shared.md` lines 847-863 for full checklist.

---

## Common Pitfalls to Avoid

1. **Smart Account vs EOA:** Check balance on EOA, check allowance for smart account
2. **BigInt Serialization:** Already handled in cartStorage, don't break it
3. **Call Order:** Approval MUST come before fillOrder in calls array
4. **Type Casting:** Use `as any` for permissionless, not everywhere
5. **UserOp Hash:** Wait for receipt to get actual transaction hash
6. **Z-Index:** Don't block wallet popup with processing overlay

See `shared.md` lines 867-993 for detailed gotchas.

---

## End of Plan
